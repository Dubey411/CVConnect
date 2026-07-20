CREATE TABLE "User" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "password" TEXT, "name" TEXT NOT NULL, "refreshToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Job" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "company" TEXT, "description" TEXT NOT NULL, "skills" JSONB NOT NULL, "requirements" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Resume" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "original" JSONB NOT NULL, "optimized" JSONB, "sourceUrl" TEXT, "jobId" TEXT, "matchScore" DOUBLE PRECISION, "atsScore" DOUBLE PRECISION, "analysis" JSONB, "skillGap" JSONB, "status" TEXT NOT NULL DEFAULT 'completed', "version" INTEGER NOT NULL DEFAULT 1, "parentId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Resume_userId_createdAt_idx" ON "Resume"("userId", "createdAt");
CREATE INDEX "Resume_matchScore_idx" ON "Resume"("matchScore");
CREATE INDEX "Job_userId_createdAt_idx" ON "Job"("userId", "createdAt");
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
