-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('REGISTRATION', 'RESET');

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLOSED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "type" "OtpType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "KycDocumentType" NOT NULL,
    "frontFilePath" TEXT NOT NULL,
    "backFilePath" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "principal" DECIMAL(15,2) NOT NULL,
    "annualRate" DECIMAL(5,4),
    "termMonths" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "disbursedAt" TIMESTAMP(3),
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amortization_schedule" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "principalDue" DECIMAL(15,2) NOT NULL,
    "interestDue" DECIMAL(15,2) NOT NULL,
    "totalDue" DECIMAL(15,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amortization_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_ledger" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dailyInterest" DECIMAL(15,6) NOT NULL,
    "balanceSnapshot" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interest_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "otp_records_userId_type_idx" ON "otp_records"("userId", "type");

-- CreateIndex
CREATE INDEX "otp_records_userId_type_verified_idx" ON "otp_records"("userId", "type", "verified");

-- CreateIndex
CREATE INDEX "otp_records_expiresAt_idx" ON "otp_records"("expiresAt");

-- CreateIndex
CREATE INDEX "otp_records_expiresAt_verified_idx" ON "otp_records"("expiresAt", "verified");

-- CreateIndex
CREATE INDEX "kyc_submissions_userId_idx" ON "kyc_submissions"("userId");

-- CreateIndex
CREATE INDEX "kyc_submissions_userId_status_idx" ON "kyc_submissions"("userId", "status");

-- CreateIndex
CREATE INDEX "kyc_submissions_status_idx" ON "kyc_submissions"("status");

-- CreateIndex
CREATE INDEX "kyc_submissions_status_createdAt_idx" ON "kyc_submissions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "kyc_submissions_reviewedBy_idx" ON "kyc_submissions"("reviewedBy");

-- CreateIndex
CREATE INDEX "loans_userId_idx" ON "loans"("userId");

-- CreateIndex
CREATE INDEX "loans_userId_status_idx" ON "loans"("userId", "status");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_status_createdAt_idx" ON "loans"("status", "createdAt");

-- CreateIndex
CREATE INDEX "loans_disbursedAt_idx" ON "loans"("disbursedAt");

-- CreateIndex
CREATE INDEX "amortization_schedule_loanId_idx" ON "amortization_schedule"("loanId");

-- CreateIndex
CREATE INDEX "amortization_schedule_loanId_dueDate_idx" ON "amortization_schedule"("loanId", "dueDate");

-- CreateIndex
CREATE INDEX "amortization_schedule_loanId_paid_dueDate_idx" ON "amortization_schedule"("loanId", "paid", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "amortization_schedule_loanId_installmentNo_key" ON "amortization_schedule"("loanId", "installmentNo");

-- CreateIndex
CREATE INDEX "interest_ledger_date_idx" ON "interest_ledger"("date");

-- CreateIndex
CREATE INDEX "interest_ledger_loanId_date_idx" ON "interest_ledger"("loanId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "interest_ledger_loanId_date_key" ON "interest_ledger"("loanId", "date");

-- AddForeignKey
ALTER TABLE "otp_records" ADD CONSTRAINT "otp_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amortization_schedule" ADD CONSTRAINT "amortization_schedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_ledger" ADD CONSTRAINT "interest_ledger_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "users"
ADD CONSTRAINT "users_firstName_not_blank_chk" CHECK (length(trim("firstName")) > 0),
ADD CONSTRAINT "users_lastName_not_blank_chk" CHECK (length(trim("lastName")) > 0);

ALTER TABLE "otp_records"
ADD CONSTRAINT "otp_records_attempts_range_chk" CHECK ("attempts" >= 0 AND "attempts" <= 3),
ADD CONSTRAINT "otp_records_expires_after_created_chk" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "kyc_submissions"
ADD CONSTRAINT "kyc_submissions_review_consistency_chk" CHECK (
    ("status" = 'SUBMITTED' AND "reviewedBy" IS NULL)
    OR ("status" IN ('APPROVED', 'REJECTED') AND "reviewedBy" IS NOT NULL)
),
ADD CONSTRAINT "kyc_submissions_rejection_note_chk" CHECK (
    ("status" = 'REJECTED' AND "rejectionNote" IS NOT NULL AND length(trim("rejectionNote")) > 0)
    OR ("status" <> 'REJECTED' AND "rejectionNote" IS NULL)
);

ALTER TABLE "loans"
ADD CONSTRAINT "loans_principal_positive_chk" CHECK ("principal" > 0),
ADD CONSTRAINT "loans_term_months_range_chk" CHECK ("termMonths" >= 1 AND "termMonths" <= 60),
ADD CONSTRAINT "loans_annual_rate_range_chk" CHECK ("annualRate" IS NULL OR ("annualRate" >= 0 AND "annualRate" <= 1)),
ADD CONSTRAINT "loans_active_disbursed_chk" CHECK (
    ("status" = 'ACTIVE' AND "disbursedAt" IS NOT NULL)
    OR ("status" <> 'ACTIVE')
);

ALTER TABLE "amortization_schedule"
ADD CONSTRAINT "amortization_installment_positive_chk" CHECK ("installmentNo" > 0),
ADD CONSTRAINT "amortization_principal_non_negative_chk" CHECK ("principalDue" >= 0),
ADD CONSTRAINT "amortization_interest_non_negative_chk" CHECK ("interestDue" >= 0),
ADD CONSTRAINT "amortization_total_consistency_chk" CHECK ("totalDue" = "principalDue" + "interestDue");

ALTER TABLE "interest_ledger"
ADD CONSTRAINT "interest_ledger_daily_non_negative_chk" CHECK ("dailyInterest" >= 0),
ADD CONSTRAINT "interest_ledger_balance_non_negative_chk" CHECK ("balanceSnapshot" >= 0);

