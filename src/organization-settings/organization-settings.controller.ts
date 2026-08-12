import { Body, Controller, Get, Patch } from '@nestjs/common';
import { OrganizationSettingsService } from './organization-settings.service';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';

@Controller('organization-settings')
export class OrganizationSettingsController {
  constructor(private readonly settingsService: OrganizationSettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Patch()
  update(@Body() dto: UpdateOrganizationSettingsDto) {
    return this.settingsService.update(dto);
  }
}
