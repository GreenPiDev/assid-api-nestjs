import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { EventsModule } from '../events/events.module';
import { StatsController } from './stats.controller';

@Module({
  imports: [MembersModule, EventsModule],
  controllers: [StatsController],
})
export class StatsModule {}
