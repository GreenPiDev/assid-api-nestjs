import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { validate } from 'class-validator';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { MembersService } from './members.service';
import { MembershipApplicationPdfService } from './membership-application-pdf.service';
import { ApplyMemberDto } from './dto/apply-member.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import { CardInfoDto } from './dto/card-info.dto';
import { SetApplicationStatusDto } from './dto/set-application-status.dto';
import { InfoRequestDto } from './dto/info-request.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ApplicationStatus, Role } from '@prisma/client';
import { StorageService } from '../common/storage/storage.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { OrganizationSettingsService } from '../organization-settings/organization-settings.service';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

const MAX_PORTFOLIO_SLIDES = 25;
const MAX_COMPANY_DOCUMENTS = 10;

const APPLICATION_DOCUMENT_FIELDS = [
  { name: 'photos', maxCount: 2 },
  { name: 'criminalRecord', maxCount: 1 },
  { name: 'idCopy', maxCount: 1 },
  { name: 'tradeRegistryGazette', maxCount: 1 },
  { name: 'taxCertificate', maxCount: 1 },
  { name: 'signatureCircular', maxCount: 1 },
] as const;

type ApplicationDocumentField = (typeof APPLICATION_DOCUMENT_FIELDS)[number]['name'];
type ApplicationFiles = Partial<Record<ApplicationDocumentField, Express.Multer.File[]>>;

const APPLICATION_DOCUMENT_LABELS: Record<ApplicationDocumentField, string> = {
  photos: 'Fotoğraf',
  criminalRecord: 'Adli Sicil Kaydı',
  idCopy: 'Kimlik Fotokopisi',
  tradeRegistryGazette: 'Ticaret Sicil Gazetesi',
  taxCertificate: 'Vergi Levhası',
  signatureCircular: 'İmza Sirküleri',
};

function requireOwnMemberId(user: AuthenticatedUser): string {
  if (!user.memberId) throw new ForbiddenException('Bu hesaba bağlı bir üyelik kaydı yok');
  return user.memberId;
}

// Built field-by-field from the raw parsed JSON — never via spread/assign —
// so a malicious payload can't sneak in properties (e.g. applicationStatus) that
// aren't explicitly read here. This is the multipart-endpoint equivalent of
// the global ValidationPipe's whitelist:true, which only applies to normal
// (non-multipart) request bodies.
function buildApplyDto(raw: Record<string, unknown>): ApplyMemberDto {
  const dto = new ApplyMemberDto();
  dto.fullName = raw.fullName as string;
  dto.companyName = raw.companyName as string | undefined;
  dto.title = raw.title as string | undefined;
  dto.companyAddress = raw.companyAddress as string | undefined;
  dto.phone = raw.phone as string | undefined;
  dto.mobilePhone = raw.mobilePhone as string | undefined;
  dto.email = raw.email as string;
  dto.sectors = raw.sectors as ApplyMemberDto['sectors'];
  dto.businessActivityTypes = raw.businessActivityTypes as ApplyMemberDto['businessActivityTypes'];
  dto.references = raw.references as string | undefined;
  dto.membershipType = raw.membershipType as ApplyMemberDto['membershipType'];
  dto.locations = raw.locations as ApplyMemberDto['locations'];
  dto.birthPlace = raw.birthPlace as string | undefined;
  dto.birthDate = raw.birthDate as string | undefined;
  dto.nationality = raw.nationality as string | undefined;
  dto.nationalId = raw.nationalId as string | undefined;
  dto.maritalStatus = raw.maritalStatus as ApplyMemberDto['maritalStatus'];
  dto.faxPhone = raw.faxPhone as string | undefined;
  dto.personalMobilePhone = raw.personalMobilePhone as string | undefined;
  dto.affiliatedOrganizations = raw.affiliatedOrganizations as string | undefined;
  dto.contactPreference = raw.contactPreference as ApplyMemberDto['contactPreference'];
  dto.activityAreas = raw.activityAreas as string[] | undefined;
  dto.productsAndServices = raw.productsAndServices as string[] | undefined;
  dto.kvkkConsent = raw.kvkkConsent as boolean;
  dto.bylawsAcknowledged = raw.bylawsAcknowledged as boolean;
  dto.infoAccuracyConfirmed = raw.infoAccuracyConfirmed as boolean;
  dto.collectionType = raw.collectionType as ApplyMemberDto['collectionType'];
  dto.autoDebitDate = raw.autoDebitDate as string | undefined;
  dto.autoDebitDayOfMonth = raw.autoDebitDayOfMonth as number | undefined;
  dto.paymentHolderFullName = raw.paymentHolderFullName as string | undefined;
  dto.paymentHolderCompanyName = raw.paymentHolderCompanyName as string | undefined;
  dto.paymentHolderTitle = raw.paymentHolderTitle as string | undefined;
  dto.paymentHolderCompanyAddress = raw.paymentHolderCompanyAddress as string | undefined;
  dto.cardHolderName = raw.cardHolderName as string | undefined;
  dto.cardNumber = raw.cardNumber as string | undefined;
  dto.cardExpiry = raw.cardExpiry as string | undefined;
  dto.cardCvc = raw.cardCvc as string | undefined;
  dto.paymentConsent = raw.paymentConsent as boolean | undefined;
  return dto;
}

@Controller('members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly storageService: StorageService,
    private readonly encryptionService: EncryptionService,
    private readonly membershipApplicationPdfService: MembershipApplicationPdfService,
    private readonly organizationSettingsService: OrganizationSettingsService,
  ) {}

  // Logo, R2'de PNG/JPEG olarak yüklendiyse PDF header'ına gömülebilir;
  // webp/svg gibi pdf-lib'in gömemediği formatlarda veya logo hiç
  // yoksa/indirilemezse sessizce metin tabanlı header fallback'ine düşülür
  // (bkz. MembershipApplicationPdfService).
  private async loadLogoImage(logoUrl?: string): Promise<{ bytes: Uint8Array; format: 'png' | 'jpg' } | undefined> {
    if (!logoUrl) return undefined;
    let key: string | null;
    try {
      key = new URL(logoUrl).searchParams.get('key');
    } catch {
      return undefined;
    }
    if (!key) return undefined;

    try {
      const file = await this.storageService.download(key);
      const format = file.contentType === 'image/png' ? 'png' : file.contentType === 'image/jpeg' ? 'jpg' : null;
      if (!format) return undefined;

      const chunks: Buffer[] = [];
      for await (const chunk of file.body) chunks.push(chunk as Buffer);
      return { bytes: Buffer.concat(chunks), format };
    } catch {
      return undefined;
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Post('apply')
  @UseInterceptors(
    FileFieldsInterceptor([...APPLICATION_DOCUMENT_FIELDS], {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
    }),
  )
  async apply(
    @Body('payload') payloadJson: string,
    @UploadedFiles() files: ApplicationFiles,
    @Res() res: Response,
  ) {
    if (!payloadJson) throw new BadRequestException('Başvuru verisi bulunamadı');

    let raw: unknown;
    try {
      raw = JSON.parse(payloadJson);
    } catch {
      throw new BadRequestException('Başvuru verisi okunamadı');
    }
    if (typeof raw !== 'object' || raw === null) throw new BadRequestException('Başvuru verisi okunamadı');

    const dto = buildApplyDto(raw as Record<string, unknown>);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})));
    }

    const hasCardInfo = Boolean(dto.cardHolderName || dto.cardNumber || dto.cardExpiry || dto.cardCvc);
    if (hasCardInfo && dto.paymentConsent !== true) {
      throw new BadRequestException(
        'Kart bilgisi girildiyse üyelik aidatının karttan çekilmesine rıza onayı zorunludur',
      );
    }

    for (const [field, fileList] of Object.entries(files ?? {}) as [ApplicationDocumentField, Express.Multer.File[]][]) {
      for (const file of fileList) {
        if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
          throw new BadRequestException(
            `${APPLICATION_DOCUMENT_LABELS[field]}: sadece PNG, JPEG, WEBP veya PDF yüklenebilir`,
          );
        }
      }
    }

    const {
      kvkkConsent: _kvkkConsent,
      bylawsAcknowledged: _bylawsAcknowledged,
      infoAccuracyConfirmed: _infoAccuracyConfirmed,
      paymentHolderFullName,
      paymentHolderCompanyName,
      paymentHolderTitle,
      paymentHolderCompanyAddress,
      cardHolderName,
      cardNumber,
      cardExpiry,
      cardCvc,
      paymentConsent,
      ...memberFields
    } = dto;
    const payload: Record<string, unknown> = {
      ...memberFields,
      birthDate: memberFields.birthDate ? new Date(memberFields.birthDate) : undefined,
      autoDebitDate: memberFields.autoDebitDate ? new Date(memberFields.autoDebitDate) : undefined,
      kvkkConsentAt: new Date(),
      bylawsAcknowledgedAt: new Date(),
      infoAccuracyConfirmedAt: new Date(),
      cardDataEncrypted: hasCardInfo
        ? this.encryptionService.encrypt(JSON.stringify({ cardHolderName, cardNumber, cardExpiry, cardCvc }))
        : undefined,
      paymentConsentAt: paymentConsent === true ? new Date() : undefined,
    };
    const member = await this.membersService.create(payload);

    const documents: { label: string; url: string }[] = [];
    for (const [field, fileList] of Object.entries(files ?? {}) as [ApplicationDocumentField, Express.Multer.File[]][]) {
      for (const file of fileList) {
        const url = await this.storageService.uploadImage(file, `membershipDocs/${member._id}`, 'auto');
        documents.push({ label: APPLICATION_DOCUMENT_LABELS[field], url });
      }
    }
    if (documents.length > 0) {
      await this.membersService.setDocuments(member._id, documents);
    }

    const orgSettings = await this.organizationSettingsService.get();
    const logoImage = await this.loadLogoImage(orgSettings.logo ?? undefined);

    const pdfBuffer = await this.membershipApplicationPdfService.generate({
      applicationDate: new Date(),
      orgName: orgSettings.name ?? 'Dernek',
      orgShortName: orgSettings.shortName ?? undefined,
      orgAddress: orgSettings.address ?? undefined,
      orgPhone: orgSettings.phone ?? undefined,
      orgEmail: orgSettings.email ?? undefined,
      orgWebsite: orgSettings.website ?? undefined,
      logoImage,
      fullName: dto.fullName,
      companyName: dto.companyName,
      title: dto.title,
      companyAddress: dto.companyAddress,
      phone: dto.phone,
      mobilePhone: dto.mobilePhone,
      email: dto.email,
      sectors: dto.sectors,
      businessActivityTypes: dto.businessActivityTypes,
      references: dto.references,
      membershipType: dto.membershipType,
      birthPlace: dto.birthPlace,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      nationality: dto.nationality,
      nationalId: dto.nationalId,
      maritalStatus: dto.maritalStatus,
      faxPhone: dto.faxPhone,
      personalMobilePhone: dto.personalMobilePhone,
      affiliatedOrganizations: dto.affiliatedOrganizations,
      contactPreference: dto.contactPreference,
      documentLabels: documents.map((d) => d.label),
      collectionType: dto.collectionType,
      autoDebitDate: dto.autoDebitDate ? new Date(dto.autoDebitDate) : undefined,
      autoDebitDayOfMonth: dto.autoDebitDayOfMonth,
      paymentHolderFullName,
      paymentHolderCompanyName,
      paymentHolderTitle,
      paymentHolderCompanyAddress,
      cardNumberLast4: cardNumber ? cardNumber.replace(/\s+/g, '').slice(-4) : undefined,
      paymentConsent: paymentConsent === true,
      bylawsAcknowledged: dto.bylawsAcknowledged,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="assid-uyelik-basvuru-formu.pdf"',
    });
    res.send(pdfBuffer);
  }

  @Get()
  findAll(
    @Query('sector') sector?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    // Public directory endpoint: always approved-only, regardless of any
    // client-supplied filter, so pending applicants' contact info is never
    // exposed without auth. Unapproved listing lives at GET /members/admin.
    return this.membersService.findAll({
      sector,
      q,
      applicationStatus: ApplicationStatus.approved,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  findAllForAdmin(
    @Query('sector') sector?: string,
    @Query('q') q?: string,
    @Query('status') status?: ApplicationStatus,
    @Query('limit') limit?: string,
  ) {
    return this.membersService.findAll({
      sector,
      q,
      applicationStatus: status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  findOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.findOne(requireOwnMemberId(user));
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  updateOwn(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMemberProfileDto) {
    return this.membersService.update(requireOwnMemberId(user), dto);
  }

  @Get('me/card-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  getOwnCardInfo(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.getCardInfo(requireOwnMemberId(user));
  }

  @Patch('me/card-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  setOwnCardInfo(@CurrentUser() user: AuthenticatedUser, @Body() dto: CardInfoDto) {
    return this.membersService.setCardInfo(requireOwnMemberId(user), dto);
  }

  @Post('me/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_LOGO_SIZE_BYTES } }))
  async uploadOwnLogo(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Sadece PNG, JPEG, WEBP veya SVG dosyaları yüklenebilir');
    }

    const memberId = requireOwnMemberId(user);
    const logoUrl = await this.storageService.uploadImage(file, 'member-logos');
    return this.membersService.setLogo(memberId, logoUrl);
  }

  @Post('me/portfolio-slides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  @UseInterceptors(FilesInterceptor('files', MAX_PORTFOLIO_SLIDES, { storage: memoryStorage(), limits: { fileSize: MAX_LOGO_SIZE_BYTES } }))
  async uploadOwnPortfolioSlides(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) throw new BadRequestException('Dosya bulunamadı');
    for (const file of files) {
      if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException('Sadece PNG, JPEG, WEBP veya SVG dosyaları yüklenebilir');
      }
    }

    const memberId = requireOwnMemberId(user);
    const existing = await this.membersService.findOne(memberId);
    const currentCount = (existing.portfolioSlides ?? []).length;
    if (currentCount + files.length > MAX_PORTFOLIO_SLIDES) {
      throw new BadRequestException(`En fazla ${MAX_PORTFOLIO_SLIDES} slayt yükleyebilirsiniz`);
    }

    const urls = await Promise.all(files.map((file) => this.storageService.uploadImage(file, 'member-portfolio')));
    return this.membersService.addPortfolioSlides(memberId, urls);
  }

  @Delete('me/portfolio-slides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  removeOwnPortfolioSlide(@CurrentUser() user: AuthenticatedUser, @Body() dto: { url: string }) {
    return this.membersService.removePortfolioSlide(requireOwnMemberId(user), dto.url);
  }

  @Post('me/company-documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  @UseInterceptors(FilesInterceptor('files', MAX_COMPANY_DOCUMENTS, { storage: memoryStorage(), limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES } }))
  async uploadOwnCompanyDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) throw new BadRequestException('Dosya bulunamadı');
    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('Sadece PDF dosyaları yüklenebilir');
      }
    }

    const memberId = requireOwnMemberId(user);
    const docs = await Promise.all(
      files.map(async (file) => ({
        label: file.originalname,
        url: await this.storageService.uploadImage(file, 'member-company-docs'),
      })),
    );
    return this.membersService.addCompanyDocuments(memberId, docs);
  }

  @Delete('me/company-documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  removeOwnCompanyDocument(@CurrentUser() user: AuthenticatedUser, @Body() dto: { url: string }) {
    return this.membersService.removeCompanyDocument(requireOwnMemberId(user), dto.url);
  }

  @Post(':id/info-request')
  async sendInfoRequest(@Param('id', ParseIdPipe) id: string, @Body() dto: InfoRequestDto) {
    await this.membersService.sendInfoRequest(id, dto);
    return { success: true };
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: string) {
    return this.membersService.findOne(id);
  }

  @Get(':id/national-id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  async getMaskedNationalId(@Param('id', ParseIdPipe) id: string) {
    const maskedNationalId = await this.membersService.getMaskedNationalId(id);
    return { maskedNationalId };
  }

  @Get(':id/card-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  getCardInfo(@Param('id', ParseIdPipe) id: string) {
    return this.membersService.getCardInfo(id);
  }

  @Patch(':id/card-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  setCardInfo(@Param('id', ParseIdPipe) id: string, @Body() dto: CardInfoDto) {
    return this.membersService.setCardInfo(id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  update(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  setApplicationStatus(@Param('id', ParseIdPipe) id: string, @Body() dto: SetApplicationStatusDto) {
    return this.membersService.setApplicationStatus(id, dto.applicationStatus);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  remove(@Param('id', ParseIdPipe) id: string) {
    return this.membersService.remove(id);
  }
}
