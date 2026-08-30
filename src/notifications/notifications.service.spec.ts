import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
  let prisma: {
    deviceToken: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let service: NotificationsService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      deviceToken: {
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new NotificationsService(prisma as unknown as PrismaService);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registerToken upserts by token, keyed on the unique token field', async () => {
    await service.registerToken({ token: 'ExponentPushToken[abc]', platform: 'ios' });

    expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
      where: { token: 'ExponentPushToken[abc]' },
      create: { token: 'ExponentPushToken[abc]', platform: 'ios' },
      update: { platform: 'ios' },
    });
  });

  it('unregisterToken deletes matching rows', async () => {
    await service.unregisterToken('ExponentPushToken[abc]');

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({ where: { token: 'ExponentPushToken[abc]' } });
  });

  it('sendToAll does nothing and never calls fetch when there are no registered devices', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([]);

    await service.sendToAll('Yeni Haber', 'Başlık');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendToAll batches tokens in groups of 100 against the Expo push endpoint', async () => {
    const tokens = Array.from({ length: 150 }, (_, i) => ({ token: `t${i}` }));
    prisma.deviceToken.findMany.mockResolvedValue(tokens);
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ data: [] }),
    });

    await service.sendToAll('Yeni Haber', 'Bir başlık', { type: 'news', id: '1' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    const body = JSON.parse(options.body as string);
    expect(body).toHaveLength(100);
    expect(body[0]).toEqual({ to: 't0', title: 'Yeni Haber', body: 'Bir başlık', data: { type: 'news', id: '1' } });

    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody).toHaveLength(50);
  });

  it('sendToAll removes tokens that Expo reports as DeviceNotRegistered', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([{ token: 'good' }, { token: 'stale' }]);
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }],
        }),
    });

    await service.sendToAll('Yeni Etkinlik', 'Etkinlik başlığı');

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({ where: { token: { in: ['stale'] } } });
  });

  it('sendToAll swallows network errors so a failed push never breaks the caller', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([{ token: 'good' }]);
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(service.sendToAll('Yeni Haber', 'x')).resolves.toBeUndefined();
  });
});
