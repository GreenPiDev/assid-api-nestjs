-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'new_conversation';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "adminReadAt" TIMESTAMP(3),
ADD COLUMN     "lastMessageAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "forAdmin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "recipientMemberId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Notification_recipientMemberId_isRead_idx" ON "Notification"("recipientMemberId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_forAdmin_isRead_idx" ON "Notification"("forAdmin", "isRead");
