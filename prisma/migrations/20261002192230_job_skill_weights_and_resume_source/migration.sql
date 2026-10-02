-- AlterEnum
ALTER TYPE "SkillSource" ADD VALUE 'RESUME';

-- AlterTable
ALTER TABLE "JobSkill" ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 3;
