-- CreateEnum
CREATE TYPE "ExperienceKind" AS ENUM ('WORK', 'PROJECT', 'EDUCATION', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "ExperienceSource" AS ENUM ('MANUAL', 'RESUME');

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ExperienceKind" NOT NULL DEFAULT 'WORK',
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "bullets" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" "ExperienceSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Experience_userId_idx" ON "Experience"("userId");

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
