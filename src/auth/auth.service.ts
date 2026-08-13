import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user._id.toString(),
      role: user.role,
      memberId: user.memberId?.toString(),
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        memberId: user.memberId?.toString(),
      },
    };
  }
}
