-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('household', 'provider', 'admin');

-- CreateEnum
CREATE TYPE "HouseholdTier" AS ENUM ('sensored', 'unsensored');

-- CreateEnum
CREATE TYPE "PitSize" AS ENUM ('standard', 'large_shared');

-- CreateEnum
CREATE TYPE "DistanceZone" AS ENUM ('near', 'mid', 'remote');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('sensor_gprs', 'ghanapost_gps', 'manual');

-- CreateEnum
CREATE TYPE "TriggerSource" AS ENUM ('sensor_fill', 'climate_preempt', 'ussd_report', 'guest_request', 'dashboard');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('CREATED', 'OFFERED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'COMPLETED', 'PAID', 'PAID_CASH', 'CLOSED', 'SLA_BREACHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchMode" AS ENUM ('assisted', 'auto');

-- CreateEnum
CREATE TYPE "JobOfferStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('paystack', 'cash');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('job', 'sensor_purchase', 'subscription');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "ProviderVerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('not_started', 'pending', 'verified');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('basic', 'standard', 'premium');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('inactive', 'active', 'past_due', 'cancelled');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('commission_accrued', 'payout_netted', 'auto_charge', 'adjustment');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('whatsapp', 'sms', 'ussd');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "HouseholdTier" NOT NULL DEFAULT 'unsensored',
    "defaultPaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'cash',
    "district" TEXT,
    "community" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "coverageZones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vehicleCapacityLiters" INTEGER,
    "baseLat" DOUBLE PRECISION,
    "baseLng" DOUBLE PRECISION,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "verificationStatus" "ProviderVerificationStatus" NOT NULL DEFAULT 'pending',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'not_started',
    "paystackSubaccountCode" TEXT,
    "creditLimit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ledgerBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pits" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "ghanaPostAddress" TEXT,
    "locationSource" "LocationSource" NOT NULL DEFAULT 'manual',
    "sizeClass" "PitSize" NOT NULL DEFAULT 'standard',
    "zone" "DistanceZone" NOT NULL DEFAULT 'near',
    "sensored" BOOLEAN NOT NULL DEFAULT false,
    "pitDepthCm" INTEGER NOT NULL DEFAULT 200,
    "dropHoles" INTEGER,
    "floodRisk" BOOLEAN NOT NULL DEFAULT false,
    "district" TEXT,
    "community" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pitId" TEXT NOT NULL,
    "hmacKey" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3),
    "lastSeen" TIMESTAMP(3),
    "lastLat" DOUBLE PRECISION,
    "lastLng" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" TEXT NOT NULL,
    "pitId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "fillPct" DECIMAL(5,2) NOT NULL,
    "fillCm" DECIMAL(7,2) NOT NULL,
    "temperatureC" DECIMAL(5,2),
    "humidityPct" DECIMAL(5,2),
    "batteryMv" INTEGER,
    "rssi" INTEGER,
    "hmacValid" BOOLEAN NOT NULL,
    "sensorTs" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "pitId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "triggerSource" "TriggerSource" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'CREATED',
    "dispatchMode" "DispatchMode" NOT NULL DEFAULT 'assisted',
    "assignedProviderId" TEXT,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceTotal" DECIMAL(10,2),
    "priceBreakdown" JSONB NOT NULL DEFAULT '{}',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'cash',
    "guestPhone" TEXT,
    "guestWhatsapp" TEXT,
    "notes" TEXT,
    "climateSnapshotId" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offeredAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "enRouteAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledReason" TEXT,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_offers" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "JobOfferStatus" NOT NULL DEFAULT 'pending',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "householdId" TEXT,
    "providerId" TEXT,
    "purpose" "PaymentPurpose" NOT NULL DEFAULT 'job',
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "commissionAmount" DECIMAL(10,2),
    "providerAmount" DECIMAL(10,2),
    "subaccountCode" TEXT,
    "paystackRef" TEXT,
    "paystackAccessCode" TEXT,
    "authorizationCode" TEXT,
    "idempotencyKey" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_ledger_entries" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "jobId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'basic',
    "splitPercent" INTEGER NOT NULL DEFAULT 70,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'inactive',
    "paystackPlanCode" TEXT,
    "paystackSubscriptionCode" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "body" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "jobId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "climate_snapshots" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "snapshotTs" TIMESTAMP(3) NOT NULL,
    "chirpsMm72h" DECIMAL(8,2) NOT NULL,
    "glofasProbability" DECIMAL(5,4) NOT NULL,
    "speiValue" DECIMAL(5,2) NOT NULL,
    "floodSignal" DECIMAL(4,3) NOT NULL,
    "droughtSignal" DECIMAL(4,3) NOT NULL,
    "riskScore" DECIMAL(4,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "climate_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "sizeClass" "PitSize" NOT NULL,
    "zone" "DistanceZone" NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "accessSurcharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "households_userId_key" ON "households"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "providers_userId_key" ON "providers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pits_code_key" ON "pits"("code");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices"("deviceId");

-- CreateIndex
CREATE INDEX "readings_pitId_sensorTs_idx" ON "readings"("pitId", "sensorTs" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "readings_deviceId_sensorTs_key" ON "readings"("deviceId", "sensorTs");

-- CreateIndex
CREATE INDEX "jobs_status_createdAt_idx" ON "jobs"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "jobs_assignedProviderId_status_idx" ON "jobs"("assignedProviderId", "status");

-- CreateIndex
CREATE INDEX "job_offers_providerId_status_idx" ON "job_offers"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "job_offers_jobId_providerId_key" ON "job_offers"("jobId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_jobId_key" ON "payments"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paystackRef_key" ON "payments"("paystackRef");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "commission_ledger_entries_providerId_createdAt_idx" ON "commission_ledger_entries"("providerId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_providerId_key" ON "subscriptions"("providerId");

-- CreateIndex
CREATE INDEX "notifications_jobId_idx" ON "notifications"("jobId");

-- CreateIndex
CREATE INDEX "climate_snapshots_district_snapshotTs_idx" ON "climate_snapshots"("district", "snapshotTs" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "climate_snapshots_district_snapshotTs_key" ON "climate_snapshots"("district", "snapshotTs");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_sizeClass_zone_key" ON "pricing_rules"("sizeClass", "zone");

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pits" ADD CONSTRAINT "pits_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_pitId_fkey" FOREIGN KEY ("pitId") REFERENCES "pits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_pitId_fkey" FOREIGN KEY ("pitId") REFERENCES "pits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pitId_fkey" FOREIGN KEY ("pitId") REFERENCES "pits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_climateSnapshotId_fkey" FOREIGN KEY ("climateSnapshotId") REFERENCES "climate_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger_entries" ADD CONSTRAINT "commission_ledger_entries_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger_entries" ADD CONSTRAINT "commission_ledger_entries_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
