/*
  Warnings:

  - You are about to drop the `Edge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `upgradeHypothesis` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Edge" DROP CONSTRAINT "Edge_fromId_fkey";

-- DropForeignKey
ALTER TABLE "Edge" DROP CONSTRAINT "Edge_toId_fkey";

-- DropForeignKey
ALTER TABLE "Edge" DROP CONSTRAINT "Edge_userId_fkey";

-- DropForeignKey
ALTER TABLE "upgradeHypothesis" DROP CONSTRAINT "upgradeHypothesis_fromId_fkey";

-- DropForeignKey
ALTER TABLE "upgradeHypothesis" DROP CONSTRAINT "upgradeHypothesis_toId_fkey";

-- DropTable
DROP TABLE "Edge";

-- DropTable
DROP TABLE "upgradeHypothesis";

-- CreateTable
CREATE TABLE "Upgrade" (
    "userId" INTEGER NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upgrade_pkey" PRIMARY KEY ("userId","fromId","toId")
);

-- CreateTable
CREATE TABLE "UpgradeHypothesis" (
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "story" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gitCommitHash" TEXT NOT NULL DEFAULT 'OLD',

    CONSTRAINT "UpgradeHypothesis_pkey" PRIMARY KEY ("fromId","toId")
);

-- AddForeignKey
ALTER TABLE "Upgrade" ADD CONSTRAINT "Upgrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upgrade" ADD CONSTRAINT "Upgrade_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "CanonicalValuesCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upgrade" ADD CONSTRAINT "Upgrade_toId_fkey" FOREIGN KEY ("toId") REFERENCES "CanonicalValuesCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeHypothesis" ADD CONSTRAINT "UpgradeHypothesis_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "CanonicalValuesCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeHypothesis" ADD CONSTRAINT "UpgradeHypothesis_toId_fkey" FOREIGN KEY ("toId") REFERENCES "CanonicalValuesCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
