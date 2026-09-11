import { IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { BusinessActivityType, ContactPreference, MaritalStatus, MembershipType } from '@prisma/client';
import { SECTOR_SLUGS, SectorSlug } from '../../common/constants/sector.constant';
import { LOCATION_SLUGS, LocationSlug } from '../../common/constants/location.constant';

// Üyenin kendi panelinden düzenleyebileceği alanlar: başvuru sırasında kendi
// beyan ettiği bilgiler. Yönetim kurulunun karar verdiği alanlar
// (sectorStatus, applicationStatus, approvedAt, isActive, notes), giriş
// kimliği olan email, ve hassas/yeniden şifreleme gerektiren alanlar
// (nationalId, kart bilgileri) buraya dahil edilmez — bunlar sadece admin
// tarafından (PATCH /members/:id, UpdateMemberDto) değiştirilebilir.
export class UpdateMemberProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsOptional()
  @IsArray()
  @IsIn(SECTOR_SLUGS, { each: true })
  sectors?: SectorSlug[];

  @IsOptional()
  @IsArray()
  @IsEnum(BusinessActivityType, { each: true })
  businessActivityTypes?: BusinessActivityType[];

  @IsOptional()
  @IsString()
  references?: string;

  @IsOptional()
  @IsEnum(MembershipType)
  membershipType?: MembershipType;

  @IsOptional()
  @IsArray()
  @IsIn(LOCATION_SLUGS, { each: true })
  locations?: LocationSlug[];

  @IsOptional()
  @IsString()
  faxPhone?: string;

  @IsOptional()
  @IsString()
  personalMobilePhone?: string;

  @IsOptional()
  @IsString()
  affiliatedOrganizations?: string;

  @IsOptional()
  @IsEnum(ContactPreference)
  contactPreference?: ContactPreference;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activityAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productsAndServices?: string[];
}
