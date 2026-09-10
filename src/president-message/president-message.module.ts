import { Module } from '@nestjs/common';
import { PresidentMessageController } from './president-message.controller';
import { PresidentMessageService } from './president-message.service';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [PresidentMessageController],
  providers: [PresidentMessageService],
  exports: [PresidentMessageService],
})
export class PresidentMessageModule {}
