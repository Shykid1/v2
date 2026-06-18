-- AlterEnum
BEGIN;
CREATE TYPE "PaymentPurpose_new" AS ENUM ('job', 'sensor_purchase');
ALTER TABLE "public"."payments" ALTER COLUMN "purpose" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "purpose" TYPE "PaymentPurpose_new" USING ("purpose"::text::"PaymentPurpose_new");
ALTER TYPE "PaymentPurpose" RENAME TO "PaymentPurpose_old";
ALTER TYPE "PaymentPurpose_new" RENAME TO "PaymentPurpose";
DROP TYPE "public"."PaymentPurpose_old";
ALTER TABLE "payments" ALTER COLUMN "purpose" SET DEFAULT 'job';
COMMIT;

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_providerId_fkey";

-- DropTable
DROP TABLE "subscriptions";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- DropEnum
DROP TYPE "SubscriptionTier";
