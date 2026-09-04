import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../common/mail/mail.service';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      memberId: user.memberId ?? undefined,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        memberId: user.memberId ?? undefined,
      },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Always resolve the same way regardless of whether the account exists
    // or is active, so this endpoint can't be used to enumerate emails.
    if (!user || !user.isActive) return;

    const rawToken = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.usersService.setResetToken(user.id, tokenHash, expiresAt);

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/sifre-sifirla?token=${rawToken}`;
    // Swallow send failures here too: the response must stay identical to
    // the "no such account" path, and a transient SMTP error shouldn't turn
    // into a 500 that reveals the account exists.
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl).catch(() => undefined);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const user = await this.usersService.findByResetTokenHash(tokenHash);
    if (!user) throw new BadRequestException('Bağlantının süresi dolmuş veya geçersiz');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.consumeResetToken(user.id, passwordHash);
  }
}
