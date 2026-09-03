-- Add new imageUrls array column
ALTER TABLE "News" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing single imageUrl into the new array column
UPDATE "News" SET "imageUrls" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL;

-- Drop columns no longer used (category, sectors, isFeatured, imageUrl)
ALTER TABLE "News" DROP COLUMN "category";
ALTER TABLE "News" DROP COLUMN "sectors";
ALTER TABLE "News" DROP COLUMN "isFeatured";
ALTER TABLE "News" DROP COLUMN "imageUrl";
