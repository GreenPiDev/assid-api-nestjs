-- CreateTable
CREATE TABLE "PresidentMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "messageHtml" TEXT,

    CONSTRAINT "PresidentMessage_pkey" PRIMARY KEY ("id")
);

