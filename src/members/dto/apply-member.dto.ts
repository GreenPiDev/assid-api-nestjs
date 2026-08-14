import {
  Equals,
  IsArray,
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

/**
 * Public membership-application payload. Deliberately narrower than
 * CreateMemberDto: it omits isApproved, logo and notes so a public,
 * unauthenticated submitter can never set those (class-validator's global
 * whitelist:true strips any such fields from the request body).
 */
export class ApplyMemberDto {
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
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  affiliatedOrganizations?: string;

  @IsOptional()
  @IsEnum(ContactPreference)
  contactPreference?: ContactPreference;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activityAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productsAndServices?: string[];

  @Equals(true, { message: 'KVKK Aydınlatma Metni onaylanmalıdır' })
  kvkkConsent: boolean;

  @Equals(true, { message: 'Dernek tüzüğü onaylanmalıdır' })
  bylawsAcknowledged: boolean;
}
