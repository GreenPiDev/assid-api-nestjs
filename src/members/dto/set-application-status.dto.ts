import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class SetApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  applicationStatus: ApplicationStatus;
}
