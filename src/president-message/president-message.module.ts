import { Module } from '@nestjs/common';
import { PresidentMessageController } from './president-message.controller';
import { PresidentMessageService } from './president-message.service';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [PresidentMessageController],
  providers: [PresidentMessageService],
  exports: [PresidentMessageService],
})
export class PresidentMessageModule {}
