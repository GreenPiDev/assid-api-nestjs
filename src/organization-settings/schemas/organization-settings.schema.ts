import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationSettingsDocument = HydratedDocument<OrganizationSettings>;

@Schema()
export class SocialLinks {
  @Prop({ trim: true })
  facebook?: string;

  @Prop({ trim: true })
  instagram?: string;

  @Prop({ trim: true })
  linkedin?: string;

  @Prop({ trim: true })
  twitter?: string;
}

export const SocialLinksSchema = SchemaFactory.createForClass(SocialLinks);

/**
 * A single document holding the deployment's organization profile
 * (name, logo, contact/address info, social links). This is what makes the
 * platform white-label: nothing about a specific association is hardcoded
 * anywhere else in the codebase, it all comes from this record.
 */
@Schema({ timestamps: true })
export class OrganizationSettings {
  @Prop({ trim: true })
  name?: string;

  @Prop({ trim: true })
  shortName?: string;

  @Prop({ trim: true })
  logo?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ type: SocialLinksSchema, default: {} })
  socialLinks?: SocialLinks;

  @Prop({ trim: true })
  footerText?: string;

  @Prop({ trim: true })
  kvkkText?: string;

  @Prop({ trim: true })
  bylawsText?: string;

  @Prop({ trim: true })
  cookiePolicyText?: string;

  @Prop({ trim: true })
  privacyPolicyText?: string;

  @Prop({ default: true })
  showKvkkConsent?: boolean;

  @Prop({ default: true })
  requireKvkkConsent?: boolean;

  @Prop({ default: true })
  showBylawsConsent?: boolean;

  @Prop({ default: true })
  requireBylawsConsent?: boolean;

  @Prop({ default: true })
  showLoginMembershipCta?: boolean;

  @Prop({ default: true })
  showMembershipFeesTable?: boolean;

  @Prop({ default: true })
  showAttachmentsSection?: boolean;

  @Prop({ default: true })
  showMembershipClassSection?: boolean;
}

export const OrganizationSettingsSchema = SchemaFactory.createForClass(OrganizationSettings);
