// @/prisma/seed.ts
// Run:  npm run db:seed
// The seed command is wired up in prisma.config.ts (Prisma 7 moved it there
// from package.json's "prisma" block).
//
// Safe to re-run. Skills/careers are upserted by slug, and each skill's
// questions are replaced with whatever is in its quiz file.
// Seed script: console.log is the script's UI.

import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Standalone script, so it opens its own adapter rather than importing the
// app's shared client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DATA_DIR = join(process.cwd(), "data");

type SkillJson = {
  slug: string;
  name: string;
  category: string;
  description?: string;
};

type CareerJson = {
  slug: string;
  title: string;
  field: string;
  description?: string;
  skills: { skill: string; weight: number }[];
};

type QuestionJson = {
  prompt: string;
  options: string[];
  correctIndex: number;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  explanation?: string;
};

type QuizJson = { skill: string; questions: QuestionJson[] };

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (e) {
    throw new Error(`Could not read/parse ${path}: ${(e as Error).message}`);
  }
}

function validateQuiz(file: string, quiz: QuizJson) {
  quiz.questions.forEach((q, i) => {
    const where = `${file} question ${i}`;
    if (q.options.length !== 4) throw new Error(`${where}: needs exactly 4 options`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3)
      throw new Error(`${where}: correctIndex out of range`);
    if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(q.difficulty))
      throw new Error(`${where}: bad difficulty "${q.difficulty}"`);
  });
}

async function main() {
  // 1. Skills
  const skills = readJson<SkillJson[]>(join(DATA_DIR, "skills.json"));
  const skillIdBySlug = new Map<string, string>();

  for (const s of skills) {
    const row = await prisma.skill.upsert({
      where: { slug: s.slug },
      update: { name: s.name, category: s.category, description: s.description },
      create: { slug: s.slug, name: s.name, category: s.category, description: s.description },
    });
    skillIdBySlug.set(s.slug, row.id);
  }
  console.log(`Skills: ${skills.length}`);

  // 2. Careers + weights
  const careers = readJson<CareerJson[]>(join(DATA_DIR, "careers.json"));

  for (const c of careers) {
    const career = await prisma.career.upsert({
      where: { slug: c.slug },
      update: { title: c.title, field: c.field, description: c.description },
      create: { slug: c.slug, title: c.title, field: c.field, description: c.description },
    });

    // Replace this career's skill links so edits to the JSON take effect
    await prisma.careerSkill.deleteMany({ where: { careerId: career.id } });

    const links = c.skills.map((cs) => {
      const skillId = skillIdBySlug.get(cs.skill);
      if (!skillId) throw new Error(`Career "${c.slug}" references unknown skill "${cs.skill}"`);
      const weight = Math.min(5, Math.max(1, Math.round(cs.weight)));
      return { careerId: career.id, skillId, weight };
    });

    await prisma.careerSkill.createMany({ data: links });
  }
  console.log(`Careers: ${careers.length}`);

  // 3. Quizzes (one file per skill)
  const quizDir = join(DATA_DIR, "quizzes");
  if (existsSync(quizDir)) {
    const files = readdirSync(quizDir).filter((f) => f.endsWith(".json"));
    let total = 0;

    for (const file of files) {
      const quiz = readJson<QuizJson>(join(quizDir, file));
      const skillId = skillIdBySlug.get(quiz.skill);
      if (!skillId) throw new Error(`${file}: unknown skill "${quiz.skill}"`);
      validateQuiz(file, quiz);

      await prisma.question.deleteMany({ where: { skillId } });
      await prisma.question.createMany({
        data: quiz.questions.map((q) => ({
          skillId,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          difficulty: q.difficulty,
          explanation: q.explanation,
          reviewed: true, // flip to false here if you want a manual review gate
        })),
      });
      total += quiz.questions.length;
      console.log(`  ${file}: ${quiz.questions.length} questions`);
    }
    console.log(`Quizzes: ${files.length} files, ${total} questions`);
  } else {
    console.log("No data/quizzes folder found, skipping questions.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());