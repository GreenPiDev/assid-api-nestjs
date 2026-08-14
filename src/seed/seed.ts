import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MembersService } from '../members/members.service';
import { NewsService } from '../news/news.service';
import { EventsService } from '../events/events.service';
import { OrganizationSettingsService } from '../organization-settings/organization-settings.service';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';
import { getModelToken } from '@nestjs/mongoose';
import { Member } from '../members/schemas/member.schema';
import { News } from '../news/schemas/news.schema';
import { Event } from '../events/schemas/event.schema';
import { Model } from 'mongoose';

import membersSeed from './data/members.seed.json';
import newsSeed from './data/news.seed.json';
import eventsSeed from './data/events.seed.json';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const membersService = app.get(MembersService);
  const newsService = app.get(NewsService);
  const eventsService = app.get(EventsService);
  const settingsService = app.get(OrganizationSettingsService);
  const usersService = app.get(UsersService);

  const memberModel = app.get<Model<Member>>(getModelToken(Member.name));
  const newsModel = app.get<Model<News>>(getModelToken(News.name));
  const eventModel = app.get<Model<Event>>(getModelToken(Event.name));

  console.log('Clearing existing members/news/events...');
  await Promise.all([
    memberModel.deleteMany({}),
    newsModel.deleteMany({}),
    eventModel.deleteMany({}),
  ]);

  console.log(`Seeding ${membersSeed.length} members...`);
  for (const member of membersSeed) {
    await membersService.create(member as any);
  }

  console.log(`Seeding ${newsSeed.length} news items...`);
  for (const item of newsSeed) {
    await newsService.create(item as any);
  }

  console.log(`Seeding ${eventsSeed.length} events...`);
  for (const item of eventsSeed) {
    await eventsService.create(item as any);
  }

  console.log('Seeding organization settings...');
  await settingsService.update({
    name: 'Ankara Siteler Sanayici ve İş İnsanları Derneği',
    shortName: 'ASSİD',
    description:
      'ASSİD; üyelerini, üretim gücünü ve yeni iş fırsatlarını tek bir dijital platformda buluşturan Ankara Siteler dijital iş ağıdır.',
    address: 'Güneşevler Mah. 21 Cad. No: 5/8 Altındağ, Ankara',
    phone: '+90 530 233 27 43',
    email: 'info@assid.com.tr',
    website: 'https://www.assid.org.tr',
    socialLinks: {
      instagram: 'https://instagram.com/assid',
    },
    footerText: '© 2026. Tüm hakları saklıdır.',
  });

  const adminEmail = 'admin@assid.org.tr';
  const existingAdmin = await usersService.findByEmail(adminEmail);
  if (!existingAdmin) {
    console.log(`Seeding default admin user (${adminEmail})...`);
    await usersService.create({
      email: adminEmail,
      password: 'ChangeMe123!',
      role: Role.ADMIN,
    });
  }

  console.log('Seed completed.');
  await app.close();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
