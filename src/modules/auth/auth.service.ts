import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IAuthService,
  AuthUser,
  AuthTokens,
} from './interfaces/auth.service.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IAuthRepository } from './interfaces/auth.repository.interface';

@Injectable()
export class AuthService implements IAuthService {
  private readonly jwtSecret: string;

  constructor(
    @Inject(IAuthRepository) private readonly authRepository: IAuthRepository,
  ) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = jwtSecret;
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const existing = await this.authRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        code: 'auth.user.exists',
        message: 'Email already registered',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const record = await this.authRepository.findPasswordByEmail(dto.email);
    if (!record) {
      throw new UnauthorizedException({
        code: 'auth.credentials.invalid',
        message: 'Invalid email or password',
      });
    }

    const isValid = await bcrypt.compare(dto.password, record.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException({
        code: 'auth.credentials.invalid',
        message: 'Invalid email or password',
      });
    }

    const user = await this.authRepository.findById(record.id);
    if (!user) {
      throw new UnauthorizedException({
        code: 'auth.unauthorized',
        message: 'User not found',
      });
    }

    await this.authRepository.revokeAllRefreshTokens(user.id);
    const tokens = await this.generateTokens(user.id, user.email);

    return { user, tokens };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: 'auth.unauthorized',
        message: 'User not found',
      });
    }
    return user;
  }

  async rotate(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.authRepository.findRefreshToken(refreshToken);
    if (!stored) {
      throw new UnauthorizedException({
        code: 'auth.refresh.invalid',
        message: 'Invalid refresh token',
      });
    }
    if (stored.revoked) {
      throw new UnauthorizedException({
        code: 'auth.refresh.revoked',
        message: 'Refresh token has been revoked',
      });
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'auth.refresh.expired',
        message: 'Refresh token has expired',
      });
    }

    await this.authRepository.revokeRefreshToken(stored.token);

    const user = await this.authRepository.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException({
        code: 'auth.unauthorized',
        message: 'User not found',
      });
    }

    return this.generateTokens(user.id, user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.authRepository.revokeRefreshToken(refreshToken);
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const accessToken = jwt.sign({ sub: userId, email }, this.jwtSecret, {
      expiresIn: '15m',
    });

    const refreshTokenValue = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.authRepository.createRefreshToken({
      token: refreshTokenValue,
      userId,
      expiresAt,
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
