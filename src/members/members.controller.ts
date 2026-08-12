import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ApproveMemberDto } from './dto/approve-member.dto';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Get()
  findAll(
    @Query('sector') sector?: string,
    @Query('q') q?: string,
    @Query('isApproved') isApproved?: string,
    @Query('limit') limit?: string,
  ) {
    return this.membersService.findAll({
      sector,
      q,
      isApproved: isApproved === undefined ? undefined : isApproved === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Patch(':id/approval')
  setApproval(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: ApproveMemberDto) {
    return this.membersService.setApproval(id, dto.isApproved ?? true);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.membersService.remove(id);
  }
}
