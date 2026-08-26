import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { withMongoId, withMongoIdList } from '../common/utils/prisma-response.util';
import { isPrismaNotFound } from '../common/utils/prisma-errors.util';

export interface FindEventsQuery {
  upcoming?: boolean;
  limit?: number;
}

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEventDto) {
    const item = await this.prisma.event.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    return withMongoId(item);
  }

  async findAll(query: FindEventsQuery = {}) {
    const items = await this.prisma.event.findMany({
      where: query.upcoming ? { startDate: { gte: new Date() } } : undefined,
      orderBy: { startDate: 'asc' },
      take: query.limit,
    });
    return withMongoIdList(items);
  }

  count() {
    return this.prisma.event.count();
  }

  async findOne(id: string) {
    const item = await this.prisma.event.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Event not found');
    return withMongoId(item);
  }

  async update(id: string, dto: UpdateEventDto) {
    try {
      const item = await this.prisma.event.update({
        where: { id },
        data: {
          ...dto,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        },
      });
      return withMongoId(item);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Event not found');
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const item = await this.prisma.event.delete({ where: { id } });
      return withMongoId(item);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Event not found');
      throw error;
    }
  }
}
