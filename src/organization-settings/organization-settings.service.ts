import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { withMongoId } from '../common/utils/prisma-response.util';

/**
 * There is exactly one organization profile per deployment, so this service
 * always operates on a single row instead of exposing list/CRUD-by-id.
 */
@Injectable()
export class OrganizationSettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.organizationSettings.findFirst();
    if (existing) return withMongoId(existing);
    const created = await this.prisma.organizationSettings.create({ data: { name: 'Yeni Dernek' } });
    return withMongoId(created);
  }

  async update(dto: UpdateOrganizationSettingsDto) {
    const data = dto as Prisma.OrganizationSettingsUpdateInput;
    const existing = await this.prisma.organizationSettings.findFirst();
    if (existing) {
      const updated = await this.prisma.organizationSettings.update({ where: { id: existing.id }, data });
      return withMongoId(updated);
    }
    const created = await this.prisma.organizationSettings.create({
      data: { name: 'Yeni Dernek', ...data } as Prisma.OrganizationSettingsCreateInput,
    });
    return withMongoId(created);
  }

  setLogo(logoUrl: string) {
    return this.update({ logo: logoUrl });
  }
}
