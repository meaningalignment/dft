-- AlterTable
ALTER TABLE "Edge" ADD COLUMN     "runId" TEXT NOT NULL DEFAULT 'OLD',
ADD COLUMN     "story" TEXT NOT NULL DEFAULT 'OLD';