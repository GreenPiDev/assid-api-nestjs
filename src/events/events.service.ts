import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export interface FindEventsQuery {
  upcoming?: boolean;
  limit?: number;
}

@Injectable()
export class EventsService {
  constructor(@InjectModel(Event.name) private eventModel: Model<EventDocument>) {}

  create(dto: CreateEventDto) {
    return this.eventModel.create(dto);
  }

  async findAll(query: FindEventsQuery = {}) {
    const filter: Record<string, unknown> = {};
    if (query.upcoming) filter.startDate = { $gte: new Date() };

    let cursor = this.eventModel.find(filter).sort({ startDate: 1 });
    if (query.limit) cursor = cursor.limit(query.limit);
    return cursor.exec();
  }

  async findOne(id: string) {
    const item = await this.eventModel.findById(id).exec();
    if (!item) throw new NotFoundException('Event not found');
    return item;
  }

  async update(id: string, dto: UpdateEventDto) {
    const item = await this.eventModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!item) throw new NotFoundException('Event not found');
    return item;
  }

  async remove(id: string) {
    const item = await this.eventModel.findByIdAndDelete(id).exec();
    if (!item) throw new NotFoundException('Event not found');
    return item;
  }
}
