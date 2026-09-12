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
import { EncryptionService } from '../common/crypto/encryption.service';
import { CardInfoDto } from './dto/card-info.dto';
import { InfoRequestDto } from './dto/info-request.dto';

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

// TC Kimlik No ve şifreli kart verisi hiçbir genel Member sorgusuyla düz
// döndürülmez — nationalId sadece getMaskedNationalId() ile maskelenmiş
// olarak, kart bilgisi sadece getCardInfo() ile şifresi çözülmüş olarak
// (ayrı, yetkilendirilmiş endpoint'ler üzerinden) erişilebilir.
const SENSITIVE_FIELD_OMIT = { nationalId: true, cardDataEncrypted: true } as const;

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
    private encryptionService: EncryptionService,
  ) {}

  async create(dto: MemberInput) {
    try {
      const member = await this.prisma.member.create({ data: toMemberData(dto), omit: SENSITIVE_FIELD_OMIT });
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
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      omit: SENSITIVE_FIELD_OMIT,
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
    const member = await this.prisma.member.findUnique({ where: { id }, omit: SENSITIVE_FIELD_OMIT });
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

  // Kart bilgisi hiçbir genel sorguda düz dönmez (bkz. SENSITIVE_FIELD_OMIT);
  // sadece bu admin/kendi-profili endpoint'leri üzerinden şifresi çözülüp
  // döndürülür.
  async getCardInfo(id: string): Promise<CardInfoDto | null> {
    const member = await this.prisma.member.findUnique({ where: { id }, select: { cardDataEncrypted: true } });
    if (!member) throw new NotFoundException('Member not found');
    if (!member.cardDataEncrypted) return null;
    return JSON.parse(this.encryptionService.decrypt(member.cardDataEncrypted)) as CardInfoDto;
  }

  async setCardInfo(id: string, dto: CardInfoDto) {
    const hasCardInfo = Boolean(dto.cardHolderName || dto.cardNumber || dto.cardExpiry || dto.cardCvc);
    try {
      await this.prisma.member.update({
        where: { id },
        data: { cardDataEncrypted: hasCardInfo ? this.encryptionService.encrypt(JSON.stringify(dto)) : null },
        omit: SENSITIVE_FIELD_OMIT,
      });
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      throw error;
    }
    return hasCardInfo ? dto : null;
  }

  async update(id: string, dto: UpdateMemberDto) {
    try {
      const member = await this.prisma.member.update({
        where: { id },
        data: toMemberData(dto) as Prisma.MemberUpdateInput,
        omit: SENSITIVE_FIELD_OMIT,
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
        omit: SENSITIVE_FIELD_OMIT,
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
      const member = await this.prisma.member.update({
        where: { id },
        data: { logo: logoUrl },
        omit: SENSITIVE_FIELD_OMIT,
      });
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
        omit: SENSITIVE_FIELD_OMIT,
      });
      return withMongoId(member);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      throw error;
    }
  }

  async addPortfolioSlides(id: string, urls: string[]) {
    const member = await this.prisma.member.findUnique({ where: { id }, select: { portfolioSlides: true } });
    if (!member) throw new NotFoundException('Member not found');
    const updated = await this.prisma.member.update({
      where: { id },
      data: { portfolioSlides: { set: [...member.portfolioSlides, ...urls] } },
      omit: SENSITIVE_FIELD_OMIT,
    });
    return withMongoId(updated);
  }

  async removePortfolioSlide(id: string, url: string) {
    const member = await this.prisma.member.findUnique({ where: { id }, select: { portfolioSlides: true } });
    if (!member) throw new NotFoundException('Member not found');
    const updated = await this.prisma.member.update({
      where: { id },
      data: { portfolioSlides: { set: member.portfolioSlides.filter((slide) => slide !== url) } },
      omit: SENSITIVE_FIELD_OMIT,
    });
    return withMongoId(updated);
  }

  async addCompanyDocuments(id: string, docs: MemberFile[]) {
    const member = await this.prisma.member.findUnique({ where: { id }, select: { companyDocuments: true } });
    if (!member) throw new NotFoundException('Member not found');
    const existing = member.companyDocuments as unknown as MemberFile[];
    const updated = await this.prisma.member.update({
      where: { id },
      data: { companyDocuments: [...existing, ...docs] as unknown as Prisma.InputJsonValue },
      omit: SENSITIVE_FIELD_OMIT,
    });
    return withMongoId(updated);
  }

  async removeCompanyDocument(id: string, url: string) {
    const member = await this.prisma.member.findUnique({ where: { id }, select: { companyDocuments: true } });
    if (!member) throw new NotFoundException('Member not found');
    const existing = member.companyDocuments as unknown as MemberFile[];
    const updated = await this.prisma.member.update({
      where: { id },
      data: { companyDocuments: existing.filter((doc) => doc.url !== url) as unknown as Prisma.InputJsonValue },
      omit: SENSITIVE_FIELD_OMIT,
    });
    return withMongoId(updated);
  }

  async sendInfoRequest(id: string, dto: InfoRequestDto) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Member not found');

    const companyName = member.companyName ?? member.fullName;
    await this.mailService.sendInfoRequestEmail(member.email, { ...dto, companyName });
    await this.prisma.notification.create({
      data: {
        recipientMemberId: id,
        type: 'info_request',
        title: 'Yeni bilgi talebi',
        body: dto.message.slice(0, 140),
      },
    });
  }

  async remove(id: string) {
    try {
      const member = await this.prisma.member.delete({ where: { id }, omit: SENSITIVE_FIELD_OMIT });
      return withMongoId(member);
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('Member not found');
      throw error;
    }
  }
}
