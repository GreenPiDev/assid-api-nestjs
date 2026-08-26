import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipFeeDto } from './dto/create-membership-fee.dto';
import { UpdateMembershipFeeDto } from './dto/update-membership-fee.dto';
import { withMongoId, withMongoIdList } from '../common/utils/prisma-response.util';
import { isPrismaNotFound } from '../common/utils/prisma-errors.util';

const DEFAULT_FEES: CreateMembershipFeeDto[] = [
  { label: 'Sektör İçi Bireysel', amount: 10000 },
  { label: 'Sektör İçi Kurumsal', amount: 20000 },
  { label: 'Sektör Dışı Bireysel', amount: 50000 },
  { label: 'Sektör Dışı Kurumsal', amount: 80000 },
  { label: 'Aylık Aidat', amount: 1000 },
];

@Injectable()
export class MembershipFeesService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.membershipFee.count();
    if (count === 0) {
      await this.prisma.membershipFee.createMany({ data: DEFAULT_FEES });
    }
  }

  async create(dto: CreateMembershipFeeDto) {
    const fee = await this.prisma.membershipFee.create({ data: dto });
    return withMongoId(fee);
  }

  async findAll() {
    const fees = await this.prisma.membershipFee.findMany({ orderBy: { createdAt: 'asc' } });
    return withMongoIdList(fees);
  }

  async update(id: string, dto: UpdateMembershipFeeDto) {
    try {
      const fee = await this.prisma.membershipFee.update({ where: { id }, data: dto });
      return withMongoId(fee);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Ücret kaydı bulunamadı');
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const fee = await this.prisma.membershipFee.delete({ where: { id } });
      return withMongoId(fee);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Ücret kaydı bulunamadı');
      throw error;
    }
  }
}
