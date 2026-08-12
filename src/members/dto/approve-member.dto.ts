import { IsBoolean, IsOptional } from 'class-validator';

export class ApproveMemberDto {
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
