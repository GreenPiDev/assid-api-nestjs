import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('EventsService', () => {
  let prisma: { event: { create: jest.Mock } };
  let notifications: { sendToAll: jest.Mock };
  let service: EventsService;

  beforeEach(() => {
    prisma = { event: { create: jest.fn() } };
    notifications = { sendToAll: jest.fn().mockResolvedValue(undefined) };
    service = new EventsService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  });

  it('sends a push notification whenever a new event is created', async () => {
    prisma.event.create.mockResolvedValue({ id: '1', title: 'Yıllık Genel Kurul', startDate: new Date() });

    await service.create({ title: 'Yıllık Genel Kurul', startDate: '2026-10-01' } as never);

    expect(notifications.sendToAll).toHaveBeenCalledWith('Yeni Etkinlik', 'Yıllık Genel Kurul', {
      type: 'event',
      id: '1',
    });
  });
});
