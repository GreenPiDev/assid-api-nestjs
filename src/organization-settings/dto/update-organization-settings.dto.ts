import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SocialLinksDto {
  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  twitter?: string;
}

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsString()
  kvkkText?: string;

  @IsOptional()
  @IsString()
  bylawsText?: string;

  @IsOptional()
  @IsString()
  cookiePolicyText?: string;

  @IsOptional()
  @IsString()
  privacyPolicyText?: string;

  @IsOptional()
  @IsBoolean()
  showKvkkConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  requireKvkkConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  showBylawsConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  requireBylawsConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  showLoginMembershipCta?: boolean;

  @IsOptional()
  @IsBoolean()
  showMembershipFeesTable?: boolean;
}
