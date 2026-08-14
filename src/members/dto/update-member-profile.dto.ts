import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateMemberProfileDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activityAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productsAndServices?: string[];
}
