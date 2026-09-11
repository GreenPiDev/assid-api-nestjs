import { IsOptional, IsString } from 'class-validator';

export class CardInfoDto {
  @IsOptional()
  @IsString()
  cardHolderName?: string;

  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  cardExpiry?: string;

  @IsOptional()
  @IsString()
  cardCvc?: string;
}
