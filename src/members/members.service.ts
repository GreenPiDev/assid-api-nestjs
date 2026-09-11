import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ApplicationStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyMemberDto } from './dto/apply-member.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { getSectorName, normalizeTr, textIncludes } from '../common/utils/search.util';
import { withMongoId, withMongoIdList } from '../common/utils/prisma-response.util';
import { isPrismaNotFound, isPrismaUniqueViolation } from '../common/utils/prisma-errors.util';
import { UsersService } from '../users/users.service';
import { MailService } from '../common/mail/mail.service';

// URL/e-posta içinde karışmasın diye 0/O/1/I/l gibi karakterler çıkarıldı.
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 12): string {
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  }
  return password;
}

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
  const { birthDate, autoDebitDate, ...rest } = dto as Record<string, unknown> & {
    birthDate?: string | Date;
    autoDebitDate?: string | Date;
  };
  return {
    ...rest,
    birthDate: birthDate ? new Date(birthDate) : undefined,
    autoDebitDate: autoDebitDate ? new Date(autoDebitDate) : undefined,
  } as Prisma.MemberCreateInput;
}

@Injectable()
export class MembersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private mailService: MailService,
  ) {}

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
    let member;
    try {
      member = await this.prisma.member.update({
        where: { id },
        data: {
          applicationStatus: status,
          approvedAt: status === ApplicationStatus.approved ? new Date() : undefined,
        },
      });
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      throw error;
    }

    // Üyelik ilk kez onaylandığında üye paneli için otomatik bir hesap
    // oluşturulup giriş bilgileri e-posta ile gönderilir. Zaten bir hesabı
    // olan üye tekrar onaylanırsa (örn. reddedilip sonra tekrar onaylanırsa)
    // mevcut hesap/şifresi korunur, yeni hesap açılmaz.
    if (status === ApplicationStatus.approved) {
      const existingUser = await this.usersService.findByEmail(member.email);
      if (!existingUser) {
        const tempPassword = generateTempPassword();
        await this.usersService.create({ email: member.email, password: tempPassword, role: Role.member, memberId: member.id });
        await this.mailService.sendMemberApprovedEmail(member.email, tempPassword).catch(() => undefined);
      }
    }

    return withMongoId(member);
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
