import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MembershipApplicationPdfService } from './membership-application-pdf.service';
import { StorageModule } from '../common/storage/storage.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../common/mail/mail.module';
import { OrganizationSettingsModule } from '../organization-settings/organization-settings.module';

@Module({
  imports: [StorageModule, UsersModule, MailModule, OrganizationSettingsModule],
  controllers: [MembersController],
  providers: [MembersService, MembershipApplicationPdfService],
  exports: [MembersService],
})
export class MembersModule {}
