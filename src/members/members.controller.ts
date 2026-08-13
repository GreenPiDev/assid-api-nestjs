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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import { ApproveMemberDto } from './dto/approve-member.dto';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Role } from '../common/enums/role.enum';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

function requireOwnMemberId(user: AuthenticatedUser): string {
  if (!user.memberId) throw new ForbiddenException('Bu hesaba bağlı bir üyelik kaydı yok');
  return user.memberId;
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
      isApproved: true,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllForAdmin(
    @Query('sector') sector?: string,
    @Query('q') q?: string,
    @Query('isApproved') isApproved?: string,
    @Query('limit') limit?: string,
  ) {
    return this.membersService.findAll({
      sector,
      q,
      isApproved: isApproved === undefined ? undefined : isApproved === 'true',
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

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Patch(':id/approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  setApproval(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: ApproveMemberDto) {
    return this.membersService.setApproval(id, dto.isApproved ?? true);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.membersService.remove(id);
  }
}
