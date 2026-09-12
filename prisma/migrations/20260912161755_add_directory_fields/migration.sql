-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'info_request';

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "companyDocuments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portfolioSlides" TEXT[] DEFAULT ARRAY[]::TEXT[];
