import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EventDocument = HydratedDocument<Event>;

/**
 * The association's own activities/events. Kept separate from News: an
 * event has a schedule (start/end date, location) rather than article content.
 */
@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  location?: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ default: false })
  isFeatured: boolean;
}

export const EventSchema = SchemaFactory.createForClass(Event);
