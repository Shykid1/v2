-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'wash_officer';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "approvalDeadline" TIMESTAMP(3),
ADD COLUMN     "approvalRequestedAt" TIMESTAMP(3),
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "overdueFlaggedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "wash_officers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "district" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wash_officers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wash_officers_userId_key" ON "wash_officers"("userId");

-- CreateIndex
CREATE INDEX "wash_officers_district_idx" ON "wash_officers"("district");

-- AddForeignKey
ALTER TABLE "wash_officers" ADD CONSTRAINT "wash_officers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
