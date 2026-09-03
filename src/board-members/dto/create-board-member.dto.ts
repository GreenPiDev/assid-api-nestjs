import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { BoardMemberCategory } from '@prisma/client';

export class CreateBoardMemberDto {
  @IsEnum(BoardMemberCategory)
  category: BoardMemberCategory;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  title?: string;
}
