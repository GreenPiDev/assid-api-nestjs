import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OrganizationSettingsService } from './organization-settings.service';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

@Controller('organization-settings')
export class OrganizationSettingsController {
  constructor(
    private readonly settingsService: OrganizationSettingsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  update(@Body() dto: UpdateOrganizationSettingsDto) {
    return this.settingsService.update(dto);
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_LOGO_SIZE_BYTES } }))
  async uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Sadece PNG, JPEG, WEBP veya SVG dosyaları yüklenebilir');
    }

    const logoUrl = await this.cloudinaryService.uploadImage(file, 'organizationLogo');
    return this.settingsService.setLogo(logoUrl);
  }
}
