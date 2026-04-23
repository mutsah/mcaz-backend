/*
  Warnings:

  - You are about to drop the `amortization_schedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `interest_ledger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kyc_submissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `loans` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DosageForm" AS ENUM ('INJECTION', 'ORAL', 'EXTERNAL', 'VAGINAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "amortization_schedule" DROP CONSTRAINT "amortization_schedule_loanId_fkey";

-- DropForeignKey
ALTER TABLE "interest_ledger" DROP CONSTRAINT "interest_ledger_loanId_fkey";

-- DropForeignKey
ALTER TABLE "kyc_submissions" DROP CONSTRAINT "kyc_submissions_reviewedBy_fkey";

-- DropForeignKey
ALTER TABLE "kyc_submissions" DROP CONSTRAINT "kyc_submissions_userId_fkey";

-- DropForeignKey
ALTER TABLE "loans" DROP CONSTRAINT "loans_userId_fkey";

-- DropTable
DROP TABLE "amortization_schedule";

-- DropTable
DROP TABLE "interest_ledger";

-- DropTable
DROP TABLE "kyc_submissions";

-- DropTable
DROP TABLE "loans";

-- DropEnum
DROP TYPE "KycDocumentType";

-- DropEnum
DROP TYPE "KycStatus";

-- DropEnum
DROP TYPE "LoanStatus";

-- CreateTable
CREATE TABLE "drugs" (
    "id" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "dosageForm" "DosageForm" NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "countryOfOrigin" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "capturedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "dateCaptured" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateApproved" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_status_history" (
    "id" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "changedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drugs_registrationNumber_key" ON "drugs"("registrationNumber");

-- CreateIndex
CREATE INDEX "drugs_status_idx" ON "drugs"("status");

-- CreateIndex
CREATE INDEX "drugs_status_createdAt_idx" ON "drugs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "drugs_registrationNumber_idx" ON "drugs"("registrationNumber");

-- CreateIndex
CREATE INDEX "drugs_dateCaptured_idx" ON "drugs"("dateCaptured");

-- CreateIndex
CREATE INDEX "drug_status_history_drugId_idx" ON "drug_status_history"("drugId");

-- CreateIndex
CREATE INDEX "drug_status_history_drugId_createdAt_idx" ON "drug_status_history"("drugId", "createdAt");

-- CreateIndex
CREATE INDEX "drug_status_history_changedBy_idx" ON "drug_status_history"("changedBy");

-- CreateIndex
CREATE INDEX "drug_status_history_createdAt_idx" ON "drug_status_history"("createdAt");

-- AddForeignKey
ALTER TABLE "drugs" ADD CONSTRAINT "drugs_capturedBy_fkey" FOREIGN KEY ("capturedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drugs" ADD CONSTRAINT "drugs_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_status_history" ADD CONSTRAINT "drug_status_history_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_status_history" ADD CONSTRAINT "drug_status_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
