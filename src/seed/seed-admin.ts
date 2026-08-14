import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminEmail = 'admin@assid.org.tr';
  const existingAdmin = await usersService.findByEmail(adminEmail);
  if (existingAdmin) {
    console.log(`Admin user already exists (${adminEmail}), skipping.`);
  } else {
    await usersService.create({
      email: adminEmail,
      password: 'ChangeMe123!',
      role: Role.ADMIN,
    });
    console.log(`Admin user created: ${adminEmail} / ChangeMe123!`);
  }

  await app.close();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
