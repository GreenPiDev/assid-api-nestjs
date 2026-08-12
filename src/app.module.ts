import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MembersModule } from './members/members.module';
import { NewsModule } from './news/news.module';
import { EventsModule } from './events/events.module';
import { OrganizationSettingsModule } from './organization-settings/organization-settings.module';
import { SectorsController } from './common/sectors.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    MembersModule,
    NewsModule,
    EventsModule,
    OrganizationSettingsModule,
  ],
  controllers: [SectorsController],
})
export class AppModule {}
