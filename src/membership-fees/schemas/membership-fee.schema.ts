import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MembershipFeeDocument = HydratedDocument<MembershipFee>;

@Schema({ timestamps: true })
export class MembershipFee {
  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ required: true })
  amount: number;
}

export const MembershipFeeSchema = SchemaFactory.createForClass(MembershipFee);
