import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { SetActiveDto } from './dto/set-active.dto';
import { UsersService } from './users.service';

function toUserResponse(user: {
  _id: unknown;
  email: string;
  role: Role;
  memberId?: unknown;
  isActive: boolean;
}) {
  return {
    id: (user._id as { toString(): string }).toString(),
    email: user.email,
    role: user.role,
    memberId: (user.memberId as { toString(): string } | undefined)?.toString(),
    isActive: user.isActive,
  };
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map(toUserResponse);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return toUserResponse(user);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  async changeOwnPassword(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(currentUser.userId);
    if (!user) throw new NotFoundException('User not found');

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.setPasswordHash(currentUser.userId, passwordHash);
    return { success: true };
  }

  @Patch(':id/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async setActive(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: SetActiveDto) {
    const user = await this.usersService.setActive(id, dto.isActive);
    return toUserResponse(user);
  }

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async adminResetPassword(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: AdminResetPasswordDto) {
    await this.usersService.adminResetPassword(id, dto.newPassword);
    return { success: true };
  }
}
