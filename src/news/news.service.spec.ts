import { NewsService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('NewsService', () => {
  let prisma: { news: { create: jest.Mock } };
  let notifications: { sendToAll: jest.Mock };
  let service: NewsService;

  beforeEach(() => {
    prisma = { news: { create: jest.fn() } };
    notifications = { sendToAll: jest.fn().mockResolvedValue(undefined) };
    service = new NewsService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  });

  it('sends a push notification when a published news item is created', async () => {
    prisma.news.create.mockResolvedValue({ id: '1', title: 'Yeni sektörel gelişme', isPublished: true });

    await service.create({ title: 'Yeni sektörel gelişme', isPublished: true } as never);

    expect(notifications.sendToAll).toHaveBeenCalledWith('Yeni Haber', 'Yeni sektörel gelişme', {
      type: 'news',
      id: '1',
    });
  });

  it('does not send a push notification for a draft (isPublished: false)', async () => {
    prisma.news.create.mockResolvedValue({ id: '2', title: 'Taslak haber', isPublished: false });

    await service.create({ title: 'Taslak haber', isPublished: false } as never);

    expect(notifications.sendToAll).not.toHaveBeenCalled();
  });
});
