/*
  Warnings:

  - You are about to drop the column `passed` on the `Attempt` table. All the data in the column will be lost.
  - You are about to drop the column `passingScore` on the `Quiz` table. All the data in the column will be lost.
  - Changed the type of `level` on the `Attempt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `level` on the `Certification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProficiencyLevel" AS ENUM ('Beginner', 'Intermediate', 'Proficient', 'Advanced');

-- AlterTable
ALTER TABLE "Attempt" DROP COLUMN "passed",
DROP COLUMN "level",
ADD COLUMN     "level" "ProficiencyLevel" NOT NULL;

-- AlterTable
ALTER TABLE "Certification" DROP COLUMN "level",
ADD COLUMN     "level" "ProficiencyLevel" NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "passingScore";
