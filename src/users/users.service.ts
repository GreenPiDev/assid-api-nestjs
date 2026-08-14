import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';

const SALT_ROUNDS = 10;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto) {
    try {
      const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      return await this.userModel.create({
        email: dto.email,
        passwordHash,
        role: dto.role,
        memberId: dto.memberId,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }

  findAll() {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async setPasswordHash(id: string, passwordHash: string) {
    const user = await this.userModel.findByIdAndUpdate(id, { passwordHash }, { new: true }).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.userModel.findByIdAndUpdate(id, { isActive }, { new: true }).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async adminResetPassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return this.setPasswordHash(id, passwordHash);
  }

  findByIdWithPassword(id: string) {
    return this.userModel.findById(id).select('+passwordHash').exec();
  }

  async setResetToken(id: string, tokenHash: string, expiresAt: Date) {
    await this.userModel
      .findByIdAndUpdate(id, { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt })
      .exec();
  }

  findByResetTokenHash(tokenHash: string) {
    return this.userModel
      .findOne({ resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: { $gt: new Date() } })
      .select('+resetPasswordTokenHash +resetPasswordExpiresAt')
      .exec();
  }

  async consumeResetToken(id: string, newPasswordHash: string) {
    await this.userModel
      .findByIdAndUpdate(id, {
        passwordHash: newPasswordHash,
        $unset: { resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 },
      })
      .exec();
  }

  static hashPassword(password: string) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}
