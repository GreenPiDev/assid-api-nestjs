import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  BusinessActivityType,
  ContactPreference,
  MembershipType,
  SectorStatus,
} from '../../common/enums/membership.enum';
import { SECTOR_SLUGS, SectorSlug } from '../../common/constants/sector.constant';

export class CreateMemberDto {
  @IsString()
  @MinLength(2)
  fullName: string;

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

  @IsEmail()
  email: string;

  @IsArray()
  @IsIn(SECTOR_SLUGS, { each: true })
  sectors: SectorSlug[];

  @IsOptional()
  @IsArray()
  @IsEnum(BusinessActivityType, { each: true })
  businessActivityTypes?: BusinessActivityType[];

  @IsOptional()
  @IsString()
  references?: string;

  @IsEnum(MembershipType)
  membershipType: MembershipType;

  @IsOptional()
  @IsEnum(SectorStatus)
  sectorStatus?: SectorStatus;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  affiliatedOrganizations?: string;

  @IsOptional()
  @IsEnum(ContactPreference)
  contactPreference?: ContactPreference;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activityAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productsAndServices?: string[];

  @IsOptional()
  @Type(() => Object)
  notes?: Record<string, string>;
}
