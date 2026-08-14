import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateMembershipFeeDto {
  @IsString()
  @MinLength(2)
  label: string;

  @IsNumber()
  @Min(0)
  amount: number;
}
