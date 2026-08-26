-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('individual', 'corporate');

-- CreateEnum
CREATE TYPE "SectorStatus" AS ENUM ('in_sector', 'out_of_sector');

-- CreateEnum
CREATE TYPE "BusinessActivityType" AS ENUM ('manufacturer', 'importer', 'exporter', 'seller', 'service_other');

-- CreateEnum
CREATE TYPE "ContactPreference" AS ENUM ('email', 'sms', 'phone');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('married', 'single');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'member');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fullName" TEXT NOT NULL,
    "companyName" TEXT,
    "title" TEXT,
    "companyAddress" TEXT,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "email" TEXT NOT NULL,
    "sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessActivityTypes" "BusinessActivityType"[] DEFAULT ARRAY[]::"BusinessActivityType"[],
    "references" TEXT,
    "membershipType" "MembershipType",
    "sectorStatus" "SectorStatus",
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "nationality" TEXT,
    "nationalId" TEXT,
    "maritalStatus" "MaritalStatus",
    "faxPhone" TEXT,
    "personalMobilePhone" TEXT,
    "affiliatedOrganizations" TEXT,
    "contactPreference" "ContactPreference",
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationStatus" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "kvkkConsentAt" TIMESTAMP(3),
    "bylawsAcknowledgedAt" TIMESTAMP(3),
    "infoAccuracyConfirmedAt" TIMESTAMP(3),
    "documents" JSONB NOT NULL DEFAULT '[]',
    "logo" TEXT,
    "activityAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productsAndServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" JSONB,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "imageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipFee" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MembershipFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "shortName" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "socialLinks" JSONB,
    "footerText" TEXT,
    "kvkkText" TEXT,
    "bylawsText" TEXT,
    "cookiePolicyText" TEXT,
    "privacyPolicyText" TEXT,
    "showKvkkConsent" BOOLEAN NOT NULL DEFAULT true,
    "requireKvkkConsent" BOOLEAN NOT NULL DEFAULT true,
    "showBylawsConsent" BOOLEAN NOT NULL DEFAULT true,
    "requireBylawsConsent" BOOLEAN NOT NULL DEFAULT true,
    "showLoginMembershipCta" BOOLEAN NOT NULL DEFAULT true,
    "showMembershipFeesTable" BOOLEAN NOT NULL DEFAULT true,
    "showAttachmentsSection" BOOLEAN NOT NULL DEFAULT true,
    "showMembershipClassSection" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "memberId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetPasswordTokenHash" TEXT,
    "resetPasswordExpiresAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
