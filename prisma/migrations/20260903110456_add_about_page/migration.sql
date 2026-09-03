-- CreateTable
CREATE TABLE "AboutPage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "bodyParagraph1" TEXT,
    "bodyParagraph2" TEXT,
    "visionText" TEXT,
    "missionText" TEXT,
    "image1" TEXT,
    "image2" TEXT,

    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

