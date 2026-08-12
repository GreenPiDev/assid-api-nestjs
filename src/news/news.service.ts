import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { News, NewsDocument } from './schemas/news.schema';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

export interface FindNewsQuery {
  sector?: string;
  isPublished?: boolean;
  limit?: number;
}

@Injectable()
export class NewsService {
  constructor(@InjectModel(News.name) private newsModel: Model<NewsDocument>) {}

  create(dto: CreateNewsDto) {
    return this.newsModel.create(dto);
  }

  async findAll(query: FindNewsQuery = {}) {
    const filter: Record<string, unknown> = {};
    if (query.sector) filter.sectors = query.sector;
    if (query.isPublished !== undefined) filter.isPublished = query.isPublished;

    let cursor = this.newsModel.find(filter).sort({ publishedAt: -1 });
    if (query.limit) cursor = cursor.limit(query.limit);
    return cursor.exec();
  }

  async findOne(id: string) {
    const item = await this.newsModel.findById(id).exec();
    if (!item) throw new NotFoundException('News item not found');
    return item;
  }

  async update(id: string, dto: UpdateNewsDto) {
    const item = await this.newsModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!item) throw new NotFoundException('News item not found');
    return item;
  }

  async remove(id: string) {
    const item = await this.newsModel.findByIdAndDelete(id).exec();
    if (!item) throw new NotFoundException('News item not found');
    return item;
  }
}
