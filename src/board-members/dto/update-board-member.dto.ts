import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateBoardMemberDto } from './create-board-member.dto';

export class UpdateBoardMemberDto extends PartialType(OmitType(CreateBoardMemberDto, ['category'] as const)) {}
