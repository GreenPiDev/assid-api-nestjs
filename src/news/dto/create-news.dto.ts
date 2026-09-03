import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
