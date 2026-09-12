import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { withMongoId, withMongoIdList } from '../common/utils/prisma-response.util';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(memberId: string, body: string, imageUrl?: string) {
    const post = await this.prisma.post.create({ data: { memberId, body, imageUrl } });
    return withMongoId(post);
  }

  async findByMember(memberId: string, limit = 30) {
    const posts = await this.prisma.post.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return withMongoIdList(posts);
  }

  async remove(id: string, memberId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Gönderi bulunamadı');
    if (post.memberId !== memberId) throw new ForbiddenException('Bu gönderiyi silme yetkiniz yok');
    await this.prisma.post.delete({ where: { id } });
  }
}
