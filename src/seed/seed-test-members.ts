import { NestFactory } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const TEST_PASSWORD = 'Test1234!';

const TEST_MEMBERS = [
  { email: 'test-uye-a@assid.org.tr', fullName: 'Test Üye A Yetkilisi', companyName: 'Test Firma A' },
  { email: 'test-uye-b@assid.org.tr', fullName: 'Test Üye B Yetkilisi', companyName: 'Test Firma B' },
];

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const usersService = app.get(UsersService);

  for (const data of TEST_MEMBERS) {
    let member = await prisma.member.findUnique({ where: { email: data.email } });
    if (!member) {
      member = await prisma.member.create({
        data: {
          fullName: data.fullName,
          companyName: data.companyName,
          email: data.email,
          applicationStatus: 'approved',
          approvedAt: new Date(),
        },
      });
      console.log(`Member created: ${data.companyName}`);
    } else {
      console.log(`Member already exists: ${data.companyName}, skipping.`);
    }

    const existingUser = await usersService.findByEmail(data.email);
    if (existingUser) {
      console.log(`User already exists (${data.email}), skipping.`);
      continue;
    }

    await usersService.create({
      email: data.email,
      password: TEST_PASSWORD,
      role: Role.member,
      memberId: member.id,
    });
    console.log(`User created: ${data.email} / ${TEST_PASSWORD}`);
  }

  await app.close();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
