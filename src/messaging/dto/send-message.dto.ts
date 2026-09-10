import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  recipientMemberId: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}
