import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SECTOR_SLUGS } from '../../common/constants/sector.constant';

export type NewsDocument = HydratedDocument<News>;

/**
 * Sectoral news / announcements. Kept as a separate entity from Event:
 * news is a read article, an event is a scheduled activity with a date/place.
 */
@Schema({ timestamps: true })
export class News {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  summary?: string;

  @Prop({ trim: true })
  content?: string;

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: [String], enum: SECTOR_SLUGS, default: [] })
  sectors: string[];

  @Prop({ default: Date.now })
  publishedAt: Date;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: true })
  isPublished: boolean;
}

export const NewsSchema = SchemaFactory.createForClass(News);
