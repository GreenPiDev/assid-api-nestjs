import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyMemberDto } from './dto/apply-member.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { getSectorName, normalizeTr, textIncludes } from '../common/utils/search.util';
import { withMongoId, withMongoIdList } from '../common/utils/prisma-response.util';
import { isPrismaNotFound, isPrismaUniqueViolation } from '../common/utils/prisma-errors.util';

export interface FindMembersQuery {
  sector?: string;
  q?: string;
  applicationStatus?: ApplicationStatus;
  limit?: number;
}

export interface MemberFile {
  label: string;
  url: string;
}

type MemberInput = CreateMemberDto | ApplyMemberDto | UpdateMemberDto | Record<string, unknown>;

function toMemberData(dto: MemberInput) {
  const { birthDate, ...rest } = dto as Record<string, unknown> & { birthDate?: string | Date };
  return {
    ...rest,
    birthDate: birthDate ? new Date(birthDate) : undefined,
  } as Prisma.MemberCreateInput;
}

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: MemberInput) {
    try {
      const member = await this.prisma.member.create({ data: toMemberData(dto) });
      return withMongoId(member);
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new ConflictException('A member with this email already exists');
      }
      throw error;
    }
  }

  countApproved() {
    return this.prisma.member.count({ where: { applicationStatus: ApplicationStatus.approved } });
  }

  async countDistinctActivityAreas() {
    const members = await this.prisma.member.findMany({
      where: { applicationStatus: ApplicationStatus.approved },
      select: { activityAreas: true },
    });
    const areas = new Set<string>();
    for (const member of members) {
      for (const area of member.activityAreas) areas.add(area);
    }
    return areas.size;
  }

  async findAll(query: FindMembersQuery = {}) {
    let members = await this.prisma.member.findMany({
      where: {
        sectors: query.sector ? { has: query.sector } : undefined,
        applicationStatus: query.applicationStatus,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Turkish text needs locale-aware lowercasing to match correctly (a
    // plain case-insensitive regex mishandles İ/ı), and "sector" search
    // means matching the sector's display name, not the stored slug — so
    // this runs in application code instead of a query filter.
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
    return withMongoIdList(members);
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');
    return withMongoId(member);
  }

  // nationalId is excluded from the default select above so it never leaks
  // through the public GET /members/:id route; this admin-only lookup masks
  // the middle digits before returning it, so even admins never see the raw
  // value here.
  async getMaskedNationalId(id: string): Promise<string | null> {
    const member = await this.prisma.member.findUnique({ where: { id }, select: { nationalId: true } });
    if (!member?.nationalId) return null;
    const digits = member.nationalId;
    return `${digits.slice(0, 3)}${'*'.repeat(Math.max(digits.length - 5, 0))}${digits.slice(-2)}`;
  }

  async update(id: string, dto: UpdateMemberDto) {
    try {
      const member = await this.prisma.member.update({
        where: { id },
        data: toMemberData(dto) as Prisma.MemberUpdateInput,
      });
      return withMongoId(member);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      if (isPrismaUniqueViolation(error)) {
        throw new ConflictException('A member with this email already exists');
      }
      throw error;
    }
  }

  async setApplicationStatus(id: string, status: ApplicationStatus) {
    try {
      const member = await this.prisma.member.update({
        where: { id },
        data: {
          applicationStatus: status,
          approvedAt: status === ApplicationStatus.approved ? new Date() : undefined,
        },
      });
      return withMongoId(member);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      throw error;
    }
  }

  async setLogo(id: string, logoUrl: string) {
    try {
      const member = await this.prisma.member.update({ where: { id }, data: { logo: logoUrl } });
      return withMongoId(member);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      throw error;
    }
  }

  async setDocuments(id: string, documents: MemberFile[]) {
    try {
      const member = await this.prisma.member.update({
        where: { id },
        data: { documents: documents as unknown as Prisma.InputJsonValue },
      });
      return withMongoId(member);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const member = await this.prisma.member.delete({ where: { id } });
      return withMongoId(member);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      throw error;
    }
  }
}
