import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagingGateway } from './messaging.gateway';

// Admin-üye konuşmalarında karşı taraf gerçek bir Member kaydı değil, dernek
// yönetiminin kendisidir — frontend'in ayırt edebilmesi için sabit bir "sentinel" nesne.
const ADMIN_SENTINEL_MEMBER = {
  id: 'admin',
  companyName: 'ASSİD Yönetimi',
  fullName: 'ASSİD Yönetimi',
  logo: null as string | null,
};

@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaService,
    private gateway: MessagingGateway,
  ) {}

  private async findOrCreateConversation(memberAId: string, memberBId: string) {
    // Katılımcı çifti yönden bağımsız tek bir conversation'a karşılık gelsin
    // diye id'ler her zaman küçükten büyüğe sıralanarak saklanır.
    const [a, b] = [memberAId, memberBId].sort();
    const existing = await this.prisma.conversation.findUnique({
      where: { memberAId_memberBId: { memberAId: a, memberBId: b } },
    });
    if (existing) return { conversation: existing, isNew: false };

    try {
      const created = await this.prisma.conversation.create({ data: { memberAId: a, memberBId: b } });
      return { conversation: created, isNew: true };
    } catch (error) {
      // Eşzamanlı iki istek aynı çift için conversation oluşturmaya çalışırsa
      // (unique constraint çakışması), diğer isteğin oluşturduğunu kullan.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.conversation.findUniqueOrThrow({
          where: { memberAId_memberBId: { memberAId: a, memberBId: b } },
        });
        return { conversation: raced, isNew: false };
      }
      throw error;
    }
  }

  // Admin konuşmalarında memberBId hep null olduğundan @@unique([memberAId, memberBId])
  // burada koruma sağlamaz (Postgres NULL'ları birbirinden ayrı sayar); bu yüzden
  // üye başına tek admin konuşması kuralı burada uygulama katmanında sağlanıyor.
  private async findOrCreateAdminConversation(memberId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { memberAId: memberId, isAdminConversation: true },
    });
    if (existing) return { conversation: existing, isNew: false };

    const created = await this.prisma.conversation.create({
      data: { memberAId: memberId, isAdminConversation: true },
    });
    return { conversation: created, isNew: true };
  }

  async sendMessage(senderMemberId: string, dto: SendMessageDto) {
    if (dto.toAdmin) {
      return this.sendMessageToAdmin(senderMemberId, dto.body);
    }
    if (!dto.recipientMemberId) {
      throw new BadRequestException('recipientMemberId veya toAdmin belirtilmeli');
    }
    if (senderMemberId === dto.recipientMemberId) {
      throw new BadRequestException('Kendinize mesaj gönderemezsiniz');
    }
    const [sender, recipient] = await Promise.all([
      this.prisma.member.findUnique({
        where: { id: senderMemberId },
        select: { companyName: true, fullName: true },
      }),
      this.prisma.member.findUnique({ where: { id: dto.recipientMemberId } }),
    ]);
    if (!recipient) throw new NotFoundException('Alıcı firma bulunamadı');

    const { conversation, isNew } = await this.findOrCreateConversation(senderMemberId, dto.recipientMemberId);
    const senderName = sender?.companyName || sender?.fullName || 'Bir üye';
    const recipientName = recipient.companyName || recipient.fullName || 'bir üye';

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: conversation.id, senderMemberId, body: dto.body },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: created.createdAt },
      });
      if (isNew) {
        await tx.notification.create({
          data: {
            recipientMemberId: dto.recipientMemberId,
            conversationId: conversation.id,
            type: 'new_message',
            title: 'Yeni mesaj',
            body: `${senderName} size mesaj gönderdi`,
          },
        });
        await tx.notification.create({
          data: {
            recipientMemberId: null,
            forAdmin: true,
            conversationId: conversation.id,
            type: 'new_conversation',
            title: 'Yeni konuşma',
            body: `${senderName} ile ${recipientName} bir konuşma başlattı`,
          },
        });
      }
      return created;
    });

    this.gateway.emitNewMessage(message, dto.recipientMemberId);

    return message;
  }

  private async sendMessageToAdmin(memberId: string, body: string) {
    const sender = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { companyName: true, fullName: true },
    });
    const { conversation, isNew } = await this.findOrCreateAdminConversation(memberId);
    const senderName = sender?.companyName || sender?.fullName || 'Bir üye';

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: conversation.id, senderMemberId: memberId, body },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: created.createdAt },
      });
      if (isNew) {
        await tx.notification.create({
          data: {
            recipientMemberId: null,
            forAdmin: true,
            conversationId: conversation.id,
            type: 'new_conversation',
            title: 'Yeni konuşma',
            body: `${senderName} ASSİD Yönetimi'ne bir mesaj gönderdi`,
          },
        });
      }
      return created;
    });

    this.gateway.emitNewMessage(message, memberId);

    return message;
  }

  async sendMessageAsAdmin(memberId: string, body: string) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Üye bulunamadı');

    const { conversation, isNew } = await this.findOrCreateAdminConversation(memberId);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: conversation.id, senderIsAdmin: true, body },
      });
      // Admin kendi gönderdiği mesajı doğal olarak okumuş sayılır.
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: created.createdAt, adminReadAt: created.createdAt },
      });
      if (isNew) {
        await tx.notification.create({
          data: {
            recipientMemberId: memberId,
            conversationId: conversation.id,
            type: 'new_message',
            title: 'Yeni mesaj',
            body: 'ASSİD Yönetimi size mesaj gönderdi',
          },
        });
      }
      return created;
    });

    this.gateway.emitNewMessage(message, memberId);

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
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((conversation) => {
      const otherMember = conversation.isAdminConversation
        ? ADMIN_SENTINEL_MEMBER
        : conversation.memberAId === memberId
          ? conversation.memberB
          : conversation.memberA;
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
      where: {
        conversationId,
        readAt: null,
        OR: [{ senderMemberId: { not: memberId } }, { senderIsAdmin: true }],
      },
      data: { readAt: new Date() },
    });

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    this.gateway.emitUnreadCountChanged(memberId);

    return messages;
  }

  async getUnreadCountForMember(memberId: string) {
    const count = await this.prisma.message.count({
      where: {
        readAt: null,
        OR: [{ senderMemberId: { not: memberId } }, { senderIsAdmin: true }],
        conversation: { OR: [{ memberAId: memberId }, { memberBId: memberId }] },
      },
    });
    return { count };
  }

  async listConversationsForAdmin() {
    const conversations = await this.prisma.conversation.findMany({
      include: {
        memberA: { select: { id: true, companyName: true, fullName: true } },
        memberB: { select: { id: true, companyName: true, fullName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map(({ messages, ...conversation }) => ({
      ...conversation,
      lastMessage: messages[0] ?? null,
    }));
  }

  async getMessagesForAdmin(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Konuşma bulunamadı');

    const messages = await this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });

    await this.prisma.conversation.update({ where: { id: conversationId }, data: { adminReadAt: new Date() } });
    this.gateway.emitAdminUnreadCountChanged();

    return messages;
  }

  async getUnreadCountForAdmin() {
    const conversations = await this.prisma.conversation.findMany({ select: { id: true, adminReadAt: true } });
    if (conversations.length === 0) return { count: 0 };

    const counts = await Promise.all(
      conversations.map((conversation) =>
        this.prisma.message.count({
          where: { conversationId: conversation.id, createdAt: { gt: conversation.adminReadAt ?? new Date(0) } },
        }),
      ),
    );
    return { count: counts.reduce((sum, n) => sum + n, 0) };
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

  async listNotificationsForAdmin() {
    return this.prisma.notification.findMany({
      where: { forAdmin: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationReadForAdmin(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw new NotFoundException('Bildirim bulunamadı');
    if (!notification.forAdmin) throw new ForbiddenException('Bu bildirime erişim yetkiniz yok');
    return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  }
}
