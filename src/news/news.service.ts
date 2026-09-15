import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { withMongoId, withMongoIdList } from '../common/utils/prisma-response.util';
import { isPrismaNotFound } from '../common/utils/prisma-errors.util';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';

export interface FindNewsQuery {
  isPublished?: boolean;
  limit?: number;
}

const NEWS_LIST_CACHE_PREFIX = 'news:list:';
const NEWS_ONE_CACHE_PREFIX = 'news:one:';

@Injectable()
export class NewsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private redis: RedisService,
  ) {}

  private async invalidateCache(id?: string) {
    await this.redis.delByPattern(`${NEWS_LIST_CACHE_PREFIX}*`);
    if (id) await this.redis.del(`${NEWS_ONE_CACHE_PREFIX}${id}`);
  }

  async create(dto: CreateNewsDto) {
    const item = await this.prisma.news.create({ data: dto });
    await this.invalidateCache();
    if (item.isPublished) {
      void this.notifications.sendToAll('Yeni Haber', item.title, { type: 'news', id: item.id });
    }
    return withMongoId(item);
  }

  async findAll(query: FindNewsQuery = {}) {
    const cacheKey = `${NEWS_LIST_CACHE_PREFIX}${query.isPublished ?? 'all'}:${query.limit ?? 'none'}`;
    const cached = await this.redis.get<ReturnType<typeof withMongoIdList>>(cacheKey);
    if (cached) return cached;

    const items = await this.prisma.news.findMany({
      where: { isPublished: query.isPublished },
      orderBy: { publishedAt: 'desc' },
      take: query.limit,
    });
    const result = withMongoIdList(items);
    await this.redis.set(cacheKey, result);
    return result;
  }

  async findOne(id: string) {
    const cacheKey = `${NEWS_ONE_CACHE_PREFIX}${id}`;
    const cached = await this.redis.get<ReturnType<typeof withMongoId>>(cacheKey);
    if (cached) return cached;

    const item = await this.prisma.news.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('News item not found');
    const result = withMongoId(item);
    await this.redis.set(cacheKey, result);
    return result;
  }

  async update(id: string, dto: UpdateNewsDto) {
    try {
      const item = await this.prisma.news.update({ where: { id }, data: dto });
      await this.invalidateCache(id);
      return withMongoId(item);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('News item not found');
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const item = await this.prisma.news.delete({ where: { id } });
      await this.invalidateCache(id);
      return withMongoId(item);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('News item not found');
      throw error;
    }
  }
}
