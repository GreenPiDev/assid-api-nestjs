-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('entry_fee', 'monthly_fee', 'both');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "autoDebitDate" TIMESTAMP(3),
ADD COLUMN     "cardDataEncrypted" TEXT,
ADD COLUMN     "collectionType" "CollectionType",
ADD COLUMN     "location" TEXT,
ADD COLUMN     "paymentConsentAt" TIMESTAMP(3);
