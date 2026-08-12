import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  BusinessActivityType,
  ContactPreference,
  MembershipType,
  SectorStatus,
} from '../../common/enums/membership.enum';
import { SECTOR_SLUGS } from '../../common/constants/sector.constant';

export type MemberDocument = HydratedDocument<Member>;

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
  @Prop({ required: true, enum: MembershipType })
  membershipType: MembershipType;

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

  @Prop({ trim: true })
  maritalStatus?: string;

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
