-- Certificate levels become Foundational / Proficient / Expert, awarded at
-- 8 / 12 / 14 of 15 correct (see lib/quiz/levels.ts). Below 8 there is no
-- certificate, so an attempt's level is now nullable.
--
-- Written by hand: Prisma's generated version drops the old enum values, which
-- fails on any database that already has attempts. Existing rows are re-levelled
-- from their stored percentage instead. Those are rounded, so the cutoffs are
-- the rounded equivalents of 14/15, 12/15 and 8/15: 93, 80, 53.

ALTER TYPE "ProficiencyLevel" RENAME TO "ProficiencyLevel_old";
CREATE TYPE "ProficiencyLevel" AS ENUM ('Foundational', 'Proficient', 'Expert');

-- Attempts: keep every attempt, null the level below the threshold.
ALTER TABLE "Attempt" ALTER COLUMN "level" DROP NOT NULL;
ALTER TABLE "Attempt" ALTER COLUMN "level" TYPE "ProficiencyLevel" USING (
  CASE
    WHEN "score" >= 93 THEN 'Expert'
    WHEN "score" >= 80 THEN 'Proficient'
    WHEN "score" >= 53 THEN 'Foundational'
  END
)::"ProficiencyLevel";

-- Certificates below the threshold no longer exist.
DELETE FROM "Certification" WHERE "score" < 53;
ALTER TABLE "Certification" ALTER COLUMN "level" TYPE "ProficiencyLevel" USING (
  CASE
    WHEN "score" >= 93 THEN 'Expert'
    WHEN "score" >= 80 THEN 'Proficient'
    ELSE 'Foundational'
  END
)::"ProficiencyLevel";

-- A QUIZ-sourced skill means "certified". Where the certificate was just
-- removed, fall back to SELF_REPORTED so the skill stays on the student's list
-- without claiming a credential.
UPDATE "UserSkill" us
SET "source" = 'SELF_REPORTED'
WHERE us."source" = 'QUIZ'
  AND NOT EXISTS (
    SELECT 1 FROM "Certification" c
    WHERE c."userId" = us."userId" AND c."skillId" = us."skillId"
  );

DROP TYPE "ProficiencyLevel_old";
