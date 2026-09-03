import { IsOptional, IsString } from 'class-validator';

export class UpdateAboutPageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  bodyParagraph1?: string;

  @IsOptional()
  @IsString()
  bodyParagraph2?: string;

  @IsOptional()
  @IsString()
  visionText?: string;

  @IsOptional()
  @IsString()
  missionText?: string;

  @IsOptional()
  @IsString()
  image1?: string;

  @IsOptional()
  @IsString()
  image2?: string;
}
