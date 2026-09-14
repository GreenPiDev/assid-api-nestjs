import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  // recipientMemberId ve toAdmin'den tam olarak biri dolu olmalı (bkz. MessagingService.sendMessage).
  @IsOptional()
  @IsUUID()
  recipientMemberId?: string;

  @IsOptional()
  @IsBoolean()
  toAdmin?: boolean;

  @IsString()
  @IsNotEmpty()
  body: string;
}
