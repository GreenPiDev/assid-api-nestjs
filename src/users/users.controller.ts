import { Body, Controller, NotFoundException, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      memberId: user.memberId?.toString(),
    };
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
}
