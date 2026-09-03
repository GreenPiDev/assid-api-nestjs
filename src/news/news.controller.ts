import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 5;
const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  create(@Body() dto: CreateNewsDto) {
    return this.newsService.create(dto);
  }

  @Post('upload-images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGE_COUNT, { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }),
  )
  async uploadImages(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files || files.length === 0) throw new BadRequestException('Dosya bulunamadı');
    for (const file of files) {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException('Sadece PNG, JPEG veya WEBP dosyaları yüklenebilir');
      }
    }

    const urls = await Promise.all(files.map((file) => this.cloudinaryService.uploadImage(file, 'news')));
    return { urls };
  }

  @Get()
  findAll(@Query('isPublished') isPublished?: string, @Query('limit') limit?: string) {
    return this.newsService.findAll({
      isPublished: isPublished === undefined ? undefined : isPublished === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: string) {
    return this.newsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  update(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  remove(@Param('id', ParseIdPipe) id: string) {
    return this.newsService.remove(id);
  }
}
