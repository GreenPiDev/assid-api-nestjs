import { IsOptional, IsString } from 'class-validator';

export class UpdatePresidentMessageDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  messageHtml?: string;
}
