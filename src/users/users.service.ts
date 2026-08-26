import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { isPrismaNotFound, isPrismaUniqueViolation } from '../common/utils/prisma-errors.util';

const SALT_ROUNDS = 10;

// passwordHash / resetPassword* mirror the old Mongoose `select: false`
// fields: excluded by default, only pulled in by the methods that need them.
const SAFE_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  email: true,
  role: true,
  memberId: true,
  isActive: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    try {
      const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
          memberId: dto.memberId,
        },
        select: SAFE_SELECT,
      });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: SAFE_SELECT });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...SAFE_SELECT, passwordHash: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  }

  async setPasswordHash(id: string, passwordHash: string) {
    try {
      return await this.prisma.user.update({ where: { id }, data: { passwordHash }, select: SAFE_SELECT });
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('User not found');
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean) {
    try {
      return await this.prisma.user.update({ where: { id }, data: { isActive }, select: SAFE_SELECT });
    } catch (error) {
      if (isPrismaNotFound(error)) throw new NotFoundException('User not found');
      throw error;
    }
  }

  async adminResetPassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return this.setPasswordHash(id, passwordHash);
  }

  findByIdWithPassword(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: { ...SAFE_SELECT, passwordHash: true } });
  }

  async setResetToken(id: string, tokenHash: string, expiresAt: Date) {
    await this.prisma.user.update({
      where: { id },
      data: { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt },
    });
  }

  findByResetTokenHash(tokenHash: string) {
    return this.prisma.user.findFirst({
      where: { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: { gt: new Date() } },
      select: { ...SAFE_SELECT, resetPasswordTokenHash: true, resetPasswordExpiresAt: true },
    });
  }

  async consumeResetToken(id: string, newPasswordHash: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      },
    });
  }

  static hashPassword(password: string) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}
