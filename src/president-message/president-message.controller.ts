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
import { PresidentMessageService } from './president-message.service';
import { UpdatePresidentMessageDto } from './dto/update-president-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Controller('president-message')
export class PresidentMessageController {
  constructor(
    private readonly presidentMessageService: PresidentMessageService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  get() {
    return this.presidentMessageService.get();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  update(@Body() dto: UpdatePresidentMessageDto) {
    return this.presidentMessageService.update(dto);
  }

  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Sadece PNG, JPEG veya WEBP dosyaları yüklenebilir');
    }

    const url = await this.cloudinaryService.uploadImage(file, 'president');
    return this.presidentMessageService.setImage(url);
  }
}
