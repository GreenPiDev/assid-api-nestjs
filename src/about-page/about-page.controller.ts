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
import { AboutPageService } from './about-page.service';
import { UpdateAboutPageDto } from './dto/update-about-page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Controller('about-page')
export class AboutPageController {
  constructor(
    private readonly aboutPageService: AboutPageService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  get() {
    return this.aboutPageService.get();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  update(@Body() dto: UpdateAboutPageDto) {
    return this.aboutPageService.update(dto);
  }

  @Post('image1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }))
  async uploadImage1(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Sadece PNG, JPEG veya WEBP dosyaları yüklenebilir');
    }

    const url = await this.cloudinaryService.uploadImage(file, 'about');
    return this.aboutPageService.setImage1(url);
  }

  @Post('image2')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }))
  async uploadImage2(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Sadece PNG, JPEG veya WEBP dosyaları yüklenebilir');
    }

    const url = await this.cloudinaryService.uploadImage(file, 'about');
    return this.aboutPageService.setImage2(url);
  }
}
