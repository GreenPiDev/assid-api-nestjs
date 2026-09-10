import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  ApplicationStatus,
  BusinessActivityType,
  CollectionType,
  ContactPreference,
  MaritalStatus,
  MembershipType,
  SectorStatus,
} from '@prisma/client';
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
  location?: string;

  @IsOptional()
  @IsEnum(CollectionType)
  collectionType?: CollectionType;

  @IsOptional()
  @IsDateString()
  autoDebitDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  autoDebitDayOfMonth?: number;

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
  @Matches(/^[0-9]{11}$/, { message: 'TC Kimlik No 11 haneli sayısal olmalıdır' })
  nationalId?: string;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

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
  @IsEnum(ApplicationStatus)
  applicationStatus?: ApplicationStatus;

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
