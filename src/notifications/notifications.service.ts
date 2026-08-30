import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100;

interface ExpoPushTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async registerToken(dto: RegisterDeviceTokenDto) {
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { token: dto.token, platform: dto.platform },
      update: { platform: dto.platform },
    });
    return { success: true };
  }

  async unregisterToken(token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
    return { success: true };
  }

  async sendToAll(title: string, body: string, data?: Record<string, unknown>) {
    const devices = await this.prisma.deviceToken.findMany({ select: { token: true } });
    if (devices.length === 0) return;

    const tokens = devices.map((d) => d.token);
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += EXPO_PUSH_CHUNK_SIZE) {
      chunks.push(tokens.slice(i, i + EXPO_PUSH_CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      try {
        const res = await fetch(EXPO_PUSH_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(chunk.map((to) => ({ to, title, body, data }))),
        });
        const json = (await res.json()) as { data?: ExpoPushTicket[] };
        await this.removeInvalidTokens(chunk, json.data ?? []);
      } catch (error) {
        this.logger.error('Push bildirimi gönderilemedi', error as Error);
      }
    }
  }

  private async removeInvalidTokens(tokens: string[], tickets: ExpoPushTicket[]) {
    const invalidTokens = tokens.filter(
      (_, index) => tickets[index]?.status === 'error' && tickets[index]?.details?.error === 'DeviceNotRegistered',
    );
    if (invalidTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }
  }
}
