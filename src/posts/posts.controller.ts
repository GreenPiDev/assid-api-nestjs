import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Role } from '@prisma/client';
import { StorageService } from '../common/storage/storage.service';

const MAX_POST_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_POST_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function requireOwnMemberId(user: AuthenticatedUser): string {
  if (!user.memberId) throw new ForbiddenException('Bu hesaba bağlı bir üyelik kaydı yok');
  return user.memberId;
}

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  findByMember(@Query('memberId', ParseIdPipe) memberId: string, @Query('limit') limit?: string) {
    return this.postsService.findByMember(memberId, limit ? Number(limit) : undefined);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: MAX_POST_IMAGE_SIZE_BYTES } }))
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (image && !ALLOWED_POST_IMAGE_MIME_TYPES.includes(image.mimetype)) {
      throw new BadRequestException('Sadece PNG, JPEG veya WEBP dosyaları yüklenebilir');
    }

    const memberId = requireOwnMemberId(user);
    const imageUrl = image ? await this.storageService.uploadImage(image, 'post-images') : undefined;
    return this.postsService.create(memberId, dto.body, imageUrl);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.member)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIdPipe) id: string) {
    return this.postsService.remove(id, requireOwnMemberId(user));
  }
}
