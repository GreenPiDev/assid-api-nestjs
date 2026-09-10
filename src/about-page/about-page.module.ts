import { Module } from '@nestjs/common';
import { AboutPageController } from './about-page.controller';
import { AboutPageService } from './about-page.service';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [AboutPageController],
  providers: [AboutPageService],
  exports: [AboutPageService],
})
export class AboutPageModule {}
