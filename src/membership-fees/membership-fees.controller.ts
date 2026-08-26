import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MembershipFeesService } from './membership-fees.service';
import { CreateMembershipFeeDto } from './dto/create-membership-fee.dto';
import { UpdateMembershipFeeDto } from './dto/update-membership-fee.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('membership-fees')
export class MembershipFeesController {
  constructor(private readonly membershipFeesService: MembershipFeesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  create(@Body() dto: CreateMembershipFeeDto) {
    return this.membershipFeesService.create(dto);
  }

  @Get()
  findAll() {
    return this.membershipFeesService.findAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  update(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateMembershipFeeDto) {
    return this.membershipFeesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  remove(@Param('id', ParseIdPipe) id: string) {
    return this.membershipFeesService.remove(id);
  }
}
