import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MembershipFee, MembershipFeeDocument } from './schemas/membership-fee.schema';
import { CreateMembershipFeeDto } from './dto/create-membership-fee.dto';
import { UpdateMembershipFeeDto } from './dto/update-membership-fee.dto';

const DEFAULT_FEES: CreateMembershipFeeDto[] = [
  { label: 'Sektör İçi Bireysel', amount: 10000 },
  { label: 'Sektör İçi Kurumsal', amount: 20000 },
  { label: 'Sektör Dışı Bireysel', amount: 50000 },
  { label: 'Sektör Dışı Kurumsal', amount: 80000 },
  { label: 'Aylık Aidat', amount: 1000 },
];

@Injectable()
export class MembershipFeesService implements OnModuleInit {
  constructor(
    @InjectModel(MembershipFee.name) private membershipFeeModel: Model<MembershipFeeDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.membershipFeeModel.countDocuments().exec();
    if (count === 0) {
      await this.membershipFeeModel.insertMany(DEFAULT_FEES);
    }
  }

  create(dto: CreateMembershipFeeDto) {
    return this.membershipFeeModel.create(dto);
  }

  findAll() {
    return this.membershipFeeModel.find().sort({ createdAt: 1 }).exec();
  }

  async update(id: string, dto: UpdateMembershipFeeDto) {
    const fee = await this.membershipFeeModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!fee) throw new NotFoundException('Ücret kaydı bulunamadı');
    return fee;
  }

  async remove(id: string) {
    const fee = await this.membershipFeeModel.findByIdAndDelete(id).exec();
    if (!fee) throw new NotFoundException('Ücret kaydı bulunamadı');
    return fee;
  }
}
