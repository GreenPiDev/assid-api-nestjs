import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [NotificationsModule, CloudinaryModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
