-- AlterTable
ALTER TABLE "Member" DROP COLUMN "location",
ADD COLUMN     "locations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
