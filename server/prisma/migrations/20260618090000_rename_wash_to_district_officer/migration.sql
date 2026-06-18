-- Rename the WASH officer role + model to District officer (in-place, preserves data).

-- 1. Enum value rename (transaction-safe in PostgreSQL 10+).
ALTER TYPE "UserRole" RENAME VALUE 'wash_officer' TO 'district_officer';

-- 2. Table rename.
ALTER TABLE "wash_officers" RENAME TO "district_officers";

-- 3. Rename the constraints + indexes to match Prisma's naming for the new table.
ALTER INDEX "wash_officers_pkey" RENAME TO "district_officers_pkey";
ALTER INDEX "wash_officers_userId_key" RENAME TO "district_officers_userId_key";
ALTER INDEX "wash_officers_district_idx" RENAME TO "district_officers_district_idx";
ALTER TABLE "district_officers" RENAME CONSTRAINT "wash_officers_userId_fkey" TO "district_officers_userId_fkey";
