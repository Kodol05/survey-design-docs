-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'REVIEW', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('TRAIT', 'ABILITY');

-- CreateEnum
CREATE TYPE "AbilityAxis" AS ENUM ('COOPERATION', 'ORG_LIFE', 'AUTONOMY');

-- CreateTable
CREATE TABLE "Roster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "department" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "loginId" TEXT,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3),
    "rosterId" TEXT,
    "employeeNo" TEXT,
    "department" TEXT,
    "position" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderNo" INTEGER NOT NULL,
    "section" INTEGER NOT NULL,
    "kind" "ItemKind" NOT NULL DEFAULT 'TRAIT',
    "scale" TEXT,
    "subscale" TEXT,
    "abilityAxis" "AbilityAxis",
    "isDirect" BOOLEAN,
    "content" TEXT NOT NULL,
    "isReverse" BOOLEAN NOT NULL DEFAULT false,
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceRef" TEXT NOT NULL,
    "antonymPairId" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "assessmentVersion" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "departmentAtTime" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSec" INTEGER,

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "elapsedMs" INTEGER NOT NULL,
    "changedCount" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "scoresJson" JSONB NOT NULL,
    "abilityScoresJson" JSONB,
    "snapshotJson" JSONB NOT NULL,
    "normBasisN" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityFlag" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "meanElapsedMs" INTEGER NOT NULL,
    "fastCount" INTEGER NOT NULL,
    "antonymAgreement" DOUBLE PRECISION NOT NULL,
    "flag" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerRating" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "axis" "AbilityAxis" NOT NULL,
    "score" INTEGER NOT NULL,
    "ratedBy" TEXT NOT NULL,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Roster_phone_key" ON "Roster"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_phone_key" ON "Employee"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_loginId_key" ON "Employee"("loginId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_rosterId_key" ON "Employee"("rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNo_key" ON "Employee"("employeeNo");

-- CreateIndex
CREATE INDEX "AuthSession_employeeId_idx" ON "AuthSession"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_version_key" ON "Assessment"("version");

-- CreateIndex
CREATE INDEX "Item_assessmentId_section_idx" ON "Item"("assessmentId", "section");

-- CreateIndex
CREATE INDEX "Item_assessmentId_kind_idx" ON "Item"("assessmentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Item_assessmentId_code_key" ON "Item"("assessmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Item_assessmentId_orderNo_key" ON "Item"("assessmentId", "orderNo");

-- CreateIndex
CREATE INDEX "TestSession_employeeId_status_idx" ON "TestSession"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Response_sessionId_itemId_key" ON "Response"("sessionId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_sessionId_key" ON "Result"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityFlag_sessionId_key" ON "QualityFlag"("sessionId");

-- CreateIndex
CREATE INDEX "ManagerRating_employeeId_idx" ON "ManagerRating"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerRating_employeeId_axis_ratedBy_key" ON "ManagerRating"("employeeId", "axis", "ratedBy");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityFlag" ADD CONSTRAINT "QualityFlag_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerRating" ADD CONSTRAINT "ManagerRating_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
