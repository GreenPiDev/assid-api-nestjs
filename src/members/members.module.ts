import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MembershipApplicationPdfService } from './membership-application-pdf.service';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [MembersController],
  providers: [MembersService, MembershipApplicationPdfService],
  exports: [MembersService],
})
export class MembersModule {}
