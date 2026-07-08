import { Injectable } from '@nestjs/common';
import {
  IAuthRepository,
  CreateUserInput,
  User,
  CreateRefreshTokenInput,
  RefreshToken,
} from './interfaces/auth.repository.interface';
import {
  createUser,
  findByEmail,
  findById,
  findPasswordByEmail,
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from '../../generated/prisma/sql';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: CreateUserInput): Promise<User> {
    const [user] = await this.prisma.$queryRawTyped(
      createUser(data.email, data.passwordHash, data.name),
    );

    if (!user) {
      throw new Error('Failed to create user');
    }

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.prisma.$queryRawTyped(findByEmail(email));
    if (!user) return null;

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.prisma.$queryRawTyped(findById(BigInt(id)));
    if (!user) return null;

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findPasswordByEmail(
    email: string,
  ): Promise<{ id: string; passwordHash: string } | null> {
    const [user] = await this.prisma.$queryRawTyped(findPasswordByEmail(email));
    if (!user) return null;

    return {
      id: user.id.toString(),
      passwordHash: user.passwordHash,
    };
  }

  async createRefreshToken(
    data: CreateRefreshTokenInput,
  ): Promise<RefreshToken> {
    const [result] = await this.prisma.$queryRawTyped(
      createRefreshToken(data.token, BigInt(data.userId), data.expiresAt),
    );

    if (!result) {
      throw new Error('Failed to create refresh token');
    }

    return {
      id: result.id.toString(),
      token: result.token,
      userId: result.userId.toString(),
      expiresAt: result.expiresAt,
      revoked: result.revoked,
      createdAt: result.createdAt,
    };
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const [result] = await this.prisma.$queryRawTyped(findRefreshToken(token));
    if (!result) return null;

    return {
      id: result.id.toString(),
      token: result.token,
      userId: result.userId.toString(),
      expiresAt: result.expiresAt,
      revoked: result.revoked,
      createdAt: result.createdAt,
    };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.$queryRawTyped(revokeRefreshToken(token));
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.$queryRawTyped(revokeAllRefreshTokens(BigInt(userId)));
  }
}
