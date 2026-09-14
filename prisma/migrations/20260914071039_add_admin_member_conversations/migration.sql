-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "isAdminConversation" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "memberBId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "senderIsAdmin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "senderMemberId" DROP NOT NULL;
