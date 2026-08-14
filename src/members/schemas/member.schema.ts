import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  BusinessActivityType,
  ContactPreference,
  MaritalStatus,
  MembershipType,
  SectorStatus,
} from '../../common/enums/membership.enum';
import { SECTOR_SLUGS } from '../../common/constants/sector.constant';

export type MemberDocument = HydratedDocument<Member>;

@Schema({ _id: false })
export class MemberFile {
  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ required: true, trim: true })
  url: string;
}

export const MemberFileSchema = SchemaFactory.createForClass(MemberFile);

/**
 * Fields below are grouped to mirror the paper membership application form
 * (general info / membership class / personal info), plus fields the member
 * manages later from their own panel (logo, activityAreas, productsAndServices),
 * plus the admin-approval gate (isApproved).
 */
@Schema({ timestamps: true })
export class Member {
  // --- General info ---
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ trim: true })
  companyName?: string;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  companyAddress?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  mobilePhone?: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  email: string;

  @Prop({ type: [String], enum: SECTOR_SLUGS, default: [] })
  sectors: string[];

  @Prop({ type: [String], enum: Object.values(BusinessActivityType), default: [] })
  businessActivityTypes: BusinessActivityType[];

  @Prop({ trim: true })
  references?: string;

  // --- Membership class (final classification is set by the board/admin) ---
  @Prop({ enum: MembershipType })
  membershipType?: MembershipType;

  @Prop({ enum: SectorStatus })
  sectorStatus?: SectorStatus;

  // --- Personal info ---
  @Prop({ trim: true })
  birthPlace?: string;

  @Prop()
  birthDate?: Date;

  @Prop({ trim: true })
  nationality?: string;

  @Prop({ trim: true, select: false })
  nationalId?: string;

  @Prop({ enum: MaritalStatus })
  maritalStatus?: MaritalStatus;

  @Prop({ trim: true })
  faxPhone?: string;

  @Prop({ trim: true })
  personalMobilePhone?: string;

  @Prop({ trim: true })
  affiliatedOrganizations?: string;

  @Prop({ enum: ContactPreference })
  contactPreference?: ContactPreference;

  // --- Application / approval workflow ---
  @Prop({ default: Date.now })
  applicationDate: Date;

  @Prop({ default: false })
  isApproved: boolean;

  @Prop()
  approvedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  // --- Consent captured at application time (timestamps are set by the
  // server when the applicant checks the corresponding box, never trusted
  // from client input directly, so they double as an audit trail) ---
  @Prop()
  kvkkConsentAt?: Date;

  @Prop()
  bylawsAcknowledgedAt?: Date;

  @Prop()
  infoAccuracyConfirmedAt?: Date;

  // --- Documents uploaded with the application (photos, kimlik, vs.) ---
  @Prop({ type: [MemberFileSchema], default: [] })
  documents: MemberFile[];

  // --- Managed later by the member from their own panel ---
  @Prop({ trim: true })
  logo?: string;

  @Prop({ type: [String], default: [] })
  activityAreas: string[];

  @Prop({ type: [String], default: [] })
  productsAndServices: string[];

  @Prop({ type: Map, of: String, default: {} })
  notes?: Map<string, string>;
}

export const MemberSchema = SchemaFactory.createForClass(Member);
