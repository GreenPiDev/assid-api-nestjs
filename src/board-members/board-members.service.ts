import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardMemberCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardMemberDto } from './dto/create-board-member.dto';
import { UpdateBoardMemberDto } from './dto/update-board-member.dto';
import { withMongoId, withMongoIdList } from '../common/utils/prisma-response.util';
import { isPrismaNotFound } from '../common/utils/prisma-errors.util';

@Injectable()
export class BoardMembersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBoardMemberDto) {
    const item = await this.prisma.boardMember.create({ data: dto });
    return withMongoId(item);
  }

  async findAll(category?: BoardMemberCategory) {
    const items = await this.prisma.boardMember.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    return withMongoIdList(items);
  }

  async update(id: string, dto: UpdateBoardMemberDto) {
    try {
      const item = await this.prisma.boardMember.update({ where: { id }, data: dto });
      return withMongoId(item);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Board member not found');
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const item = await this.prisma.boardMember.delete({ where: { id } });
      return withMongoId(item);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Board member not found');
      throw error;
    }
  }
}
