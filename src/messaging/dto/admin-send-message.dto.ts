import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AdminSendMessageDto {
  @IsUUID()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}
