import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OrganizationSettings,
  OrganizationSettingsDocument,
} from './schemas/organization-settings.schema';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';

/**
 * There is exactly one organization profile per deployment, so this service
 * always operates on a single document instead of exposing list/CRUD-by-id.
 */
@Injectable()
export class OrganizationSettingsService {
  constructor(
    @InjectModel(OrganizationSettings.name)
    private settingsModel: Model<OrganizationSettingsDocument>,
  ) {}

  async get() {
    const existing = await this.settingsModel.findOne().exec();
    if (existing) return existing;
    return this.settingsModel.create({ name: 'Yeni Dernek' });
  }

  async update(dto: UpdateOrganizationSettingsDto) {
    const existing = await this.settingsModel.findOne().exec();
    if (existing) {
      Object.assign(existing, dto);
      return existing.save();
    }
    return this.settingsModel.create({ name: 'Yeni Dernek', ...dto });
  }

  setLogo(logoUrl: string) {
    return this.update({ logo: logoUrl });
  }
}
