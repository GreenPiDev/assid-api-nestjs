import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { withMongoId, withMongoIdList } from '../common/utils/prisma-response.util';
import { isPrismaNotFound } from '../common/utils/prisma-errors.util';

export interface FindNewsQuery {
  sector?: string;
  isPublished?: boolean;
  limit?: number;
}

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNewsDto) {
    const item = await this.prisma.news.create({ data: dto });
    return withMongoId(item);
  }

  async findAll(query: FindNewsQuery = {}) {
    const items = await this.prisma.news.findMany({
      where: {
        sectors: query.sector ? { has: query.sector } : undefined,
        isPublished: query.isPublished,
      },
      orderBy: { publishedAt: 'desc' },
      take: query.limit,
    });
    return withMongoIdList(items);
  }

  async findOne(id: string) {
    const item = await this.prisma.news.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('News item not found');
    return withMongoId(item);
  }

  async update(id: string, dto: UpdateNewsDto) {
    try {
      const item = await this.prisma.news.update({ where: { id }, data: dto });
      return withMongoId(item);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('News item not found');
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const item = await this.prisma.news.delete({ where: { id } });
      return withMongoId(item);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('News item not found');
      throw error;
    }
  }
}
