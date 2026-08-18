import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '../../common/enums/membership.enum';

export class SetApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  applicationStatus: ApplicationStatus;
}
