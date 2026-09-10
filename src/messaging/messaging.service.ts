import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  private async findOrCreateConversation(memberAId: string, memberBId: string) {
    // Katılımcı çifti yönden bağımsız tek bir conversation'a karşılık gelsin
    // diye id'ler her zaman küçükten büyüğe sıralanarak saklanır.
    const [a, b] = [memberAId, memberBId].sort();
    return this.prisma.conversation.upsert({
      where: { memberAId_memberBId: { memberAId: a, memberBId: b } },
      create: { memberAId: a, memberBId: b },
      update: {},
    });
  }

  async sendMessage(senderMemberId: string, dto: SendMessageDto) {
    if (senderMemberId === dto.recipientMemberId) {
      throw new BadRequestException('Kendinize mesaj gönderemezsiniz');
    }
    const recipient = await this.prisma.member.findUnique({ where: { id: dto.recipientMemberId } });
    if (!recipient) throw new NotFoundException('Alıcı firma bulunamadı');

    const conversation = await this.findOrCreateConversation(senderMemberId, dto.recipientMemberId);

    const message = await this.prisma.message.create({
      data: { conversationId: conversation.id, senderMemberId, body: dto.body },
    });

    await this.prisma.notification.create({
      data: {
        recipientMemberId: dto.recipientMemberId,
        conversationId: conversation.id,
        type: 'new_message',
        title: 'Yeni mesaj',
        body: dto.body.slice(0, 140),
      },
    });

    return message;
  }

  async listConversations(memberId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ memberAId: memberId }, { memberBId: memberId }] },
      include: {
        memberA: { select: { id: true, companyName: true, fullName: true, logo: true } },
        memberB: { select: { id: true, companyName: true, fullName: true, logo: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((conversation) => {
      const otherMember = conversation.memberAId === memberId ? conversation.memberB : conversation.memberA;
      return {
        id: conversation.id,
        otherMember,
        lastMessage: conversation.messages[0] ?? null,
        updatedAt: conversation.updatedAt,
      };
    });
  }

  async getMessages(memberId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Konuşma bulunamadı');
    if (conversation.memberAId !== memberId && conversation.memberBId !== memberId) {
      throw new ForbiddenException('Bu konuşmaya erişim yetkiniz yok');
    }

    await this.prisma.message.updateMany({
      where: { conversationId, senderMemberId: { not: memberId }, readAt: null },
      data: { readAt: new Date() },
    });

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listConversationsForAdmin() {
    return this.prisma.conversation.findMany({
      include: {
        memberA: { select: { id: true, companyName: true, fullName: true } },
        memberB: { select: { id: true, companyName: true, fullName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessagesForAdmin(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Konuşma bulunamadı');
    return this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
  }

  async listNotifications(memberId: string) {
    return this.prisma.notification.findMany({
      where: { recipientMemberId: memberId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(memberId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw new NotFoundException('Bildirim bulunamadı');
    if (notification.recipientMemberId !== memberId) {
      throw new ForbiddenException('Bu bildirime erişim yetkiniz yok');
    }
    return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  }
}
