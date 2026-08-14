import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member, MemberDocument, MemberFile } from './schemas/member.schema';
import { ApplyMemberDto } from './dto/apply-member.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { getSectorName, normalizeTr, textIncludes } from '../common/utils/search.util';

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

export interface FindMembersQuery {
  sector?: string;
  q?: string;
  isApproved?: boolean;
  limit?: number;
}

@Injectable()
export class MembersService {
  constructor(@InjectModel(Member.name) private memberModel: Model<MemberDocument>) {}

  async create(dto: CreateMemberDto | ApplyMemberDto | Partial<Member>) {
    try {
      return await this.memberModel.create(dto);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('A member with this email already exists');
      }
      throw error;
    }
  }

  countApproved() {
    return this.memberModel.countDocuments({ isApproved: true }).exec();
  }

  async countDistinctActivityAreas() {
    const areas = await this.memberModel.distinct('activityAreas', { isApproved: true }).exec();
    return areas.length;
  }

  async findAll(query: FindMembersQuery = {}) {
    const filter: Record<string, unknown> = {};

    if (query.sector) filter.sectors = query.sector;
    if (query.isApproved !== undefined) filter.isApproved = query.isApproved;

    let members = await this.memberModel.find(filter).sort({ createdAt: -1 }).exec();

    // Turkish text needs locale-aware lowercasing to match correctly (a
    // plain case-insensitive regex mishandles İ/ı), and "sector" search
    // means matching the sector's display name, not the stored slug — so
    // this runs in application code instead of a Mongo regex filter.
    if (query.q) {
      const q = normalizeTr(query.q);
      members = members.filter((m) => {
        const nameMatch = textIncludes(m.fullName, q) || textIncludes(m.companyName, q);
        const sectorMatch = m.sectors.some((slug) => normalizeTr(getSectorName(slug)).includes(q));
        const productMatch = (m.productsAndServices || []).some((p) => textIncludes(p, q));
        const activityMatch = (m.activityAreas || []).some((a) => textIncludes(a, q));
        return nameMatch || sectorMatch || productMatch || activityMatch;
      });
    }

    if (query.limit) members = members.slice(0, query.limit);
    return members;
  }

  async findOne(id: string) {
    const member = await this.memberModel.findById(id).exec();
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async update(id: string, dto: UpdateMemberDto) {
    try {
      const member = await this.memberModel.findByIdAndUpdate(id, dto, { new: true }).exec();
      if (!member) throw new NotFoundException('Member not found');
      return member;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('A member with this email already exists');
      }
      throw error;
    }
  }

  async setApproval(id: string, isApproved: boolean) {
    const member = await this.memberModel
      .findByIdAndUpdate(
        id,
        { isApproved, approvedAt: isApproved ? new Date() : undefined },
        { new: true },
      )
      .exec();
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async setLogo(id: string, logoUrl: string) {
    const member = await this.memberModel.findByIdAndUpdate(id, { logo: logoUrl }, { new: true }).exec();
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async setDocuments(id: string, documents: MemberFile[]) {
    const member = await this.memberModel.findByIdAndUpdate(id, { documents }, { new: true }).exec();
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async remove(id: string) {
    const member = await this.memberModel.findByIdAndDelete(id).exec();
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }
}
