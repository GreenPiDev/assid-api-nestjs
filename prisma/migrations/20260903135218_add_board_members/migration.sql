-- CreateEnum
CREATE TYPE "BoardMemberCategory" AS ENUM ('yonetim_kurulu_asil', 'yonetim_kurulu_yedek', 'denetleme_kurulu_asil', 'denetleme_kurulu_yedek', 'disiplin_kurulu_asil', 'disiplin_kurulu_yedek');

-- CreateTable
CREATE TABLE "BoardMember" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "BoardMemberCategory" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BoardMember_pkey" PRIMARY KEY ("id")
);

