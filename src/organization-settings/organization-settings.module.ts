import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationSettingsController } from './organization-settings.controller';
import { OrganizationSettingsService } from './organization-settings.service';
import {
  OrganizationSettings,
  OrganizationSettingsSchema,
} from './schemas/organization-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrganizationSettings.name, schema: OrganizationSettingsSchema },
    ]),
  ],
  controllers: [OrganizationSettingsController],
  providers: [OrganizationSettingsService],
  exports: [OrganizationSettingsService],
})
export class OrganizationSettingsModule {}
