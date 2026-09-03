import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [NotificationsModule, CloudinaryModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
