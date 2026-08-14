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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { validate } from 'class-validator';
import { memoryStorage } from 'multer';
import { MembersService } from './members.service';
import { Member } from './schemas/member.schema';
import { ApplyMemberDto } from './dto/apply-member.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import { SetApplicationStatusDto } from './dto/set-application-status.dto';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Role } from '../common/enums/role.enum';
import { ApplicationStatus } from '../common/enums/membership.enum';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

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
  dto.sectorStatus = raw.sectorStatus as ApplyMemberDto['sectorStatus'];
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
  return dto;
}

@Controller('members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
  async apply(@Body('payload') payloadJson: string, @UploadedFiles() files: ApplicationFiles) {
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
      ...memberFields
    } = dto;
    const payload: Partial<Member> = {
      ...memberFields,
      birthDate: memberFields.birthDate ? new Date(memberFields.birthDate) : undefined,
      kvkkConsentAt: new Date(),
      bylawsAcknowledgedAt: new Date(),
      infoAccuracyConfirmedAt: new Date(),
    };
    const member = await this.membersService.create(payload);

    const documents: { label: string; url: string }[] = [];
    for (const [field, fileList] of Object.entries(files ?? {}) as [ApplicationDocumentField, Express.Multer.File[]][]) {
      for (const file of fileList) {
        const url = await this.cloudinaryService.uploadImage(file, `membershipDocs/${member._id.toString()}`, 'auto');
        documents.push({ label: APPLICATION_DOCUMENT_LABELS[field], url });
      }
    }
    if (documents.length > 0) {
      await this.membersService.setDocuments(member._id.toString(), documents);
    }

    return { success: true };
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
      applicationStatus: ApplicationStatus.APPROVED,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
  @Roles(Role.MEMBER)
  findOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.findOne(requireOwnMemberId(user));
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  updateOwn(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMemberProfileDto) {
    return this.membersService.update(requireOwnMemberId(user), dto);
  }

  @Post('me/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MEMBER)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_LOGO_SIZE_BYTES } }))
  async uploadOwnLogo(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Sadece PNG, JPEG, WEBP veya SVG dosyaları yüklenebilir');
    }

    const memberId = requireOwnMemberId(user);
    const logoUrl = await this.cloudinaryService.uploadImage(file, 'member-logos');
    return this.membersService.setLogo(memberId, logoUrl);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.membersService.findOne(id);
  }

  @Get(':id/national-id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getMaskedNationalId(@Param('id', ParseObjectIdPipe) id: string) {
    const maskedNationalId = await this.membersService.getMaskedNationalId(id);
    return { maskedNationalId };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  setApplicationStatus(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: SetApplicationStatusDto) {
    return this.membersService.setApplicationStatus(id, dto.applicationStatus);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.membersService.remove(id);
  }
}
