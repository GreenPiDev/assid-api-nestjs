import { Module } from '@nestjs/common';
import { AboutPageController } from './about-page.controller';
import { AboutPageService } from './about-page.service';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [AboutPageController],
  providers: [AboutPageService],
  exports: [AboutPageService],
})
export class AboutPageModule {}
