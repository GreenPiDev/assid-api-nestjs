import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { PdfModule } from './pdf/pdf.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { MembersModule } from './members/members.module';
import { NewsModule } from './news/news.module';
import { EventsModule } from './events/events.module';
import { OrganizationSettingsModule } from './organization-settings/organization-settings.module';
import { AboutPageModule } from './about-page/about-page.module';
import { PresidentMessageModule } from './president-message/president-message.module';
import { BoardMembersModule } from './board-members/board-members.module';
import { MembershipFeesModule } from './membership-fees/membership-fees.module';
import { StatsModule } from './stats/stats.module';
import { SectorsController } from './common/sectors.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    PdfModule,
    CryptoModule,
    MembersModule,
    NewsModule,
    EventsModule,
    OrganizationSettingsModule,
    AboutPageModule,
    PresidentMessageModule,
    BoardMembersModule,
    MembershipFeesModule,
    StatsModule,
    UsersModule,
    AuthModule,
    NotificationsModule,
    MessagingModule,
  ],
  controllers: [SectorsController],
})
export class AppModule {}
