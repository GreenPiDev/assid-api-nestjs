import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePresidentMessageDto } from './dto/update-president-message.dto';
import { withMongoId } from '../common/utils/prisma-response.util';

/**
 * There is exactly one "Başkanın Mesajı" content record per deployment, so
 * this service always operates on a single row instead of exposing
 * list/CRUD-by-id.
 */
@Injectable()
export class PresidentMessageService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.presidentMessage.findFirst();
    if (existing) return withMongoId(existing);
    const created = await this.prisma.presidentMessage.create({ data: {} });
    return withMongoId(created);
  }

  async update(dto: UpdatePresidentMessageDto) {
    const data = dto as Prisma.PresidentMessageUpdateInput;
    const existing = await this.prisma.presidentMessage.findFirst();
    if (existing) {
      const updated = await this.prisma.presidentMessage.update({ where: { id: existing.id }, data });
      return withMongoId(updated);
    }
    const created = await this.prisma.presidentMessage.create({ data: data as Prisma.PresidentMessageCreateInput });
    return withMongoId(created);
  }

  setImage(url: string) {
    return this.update({ image: url });
  }
}
