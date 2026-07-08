import { Test, TestingModule } from '@nestjs/testing';
import { mock } from 'jest-mock-extended';
import { AuthService } from './auth.service';
import { IAuthRepository } from './interfaces/auth.repository.interface';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  const mockRepository = mock<IAuthRepository>();

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: IAuthRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return user + tokens', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.createUser.mockResolvedValue({
        id: '1',
        email: 'new@test.com',
        name: 'New User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepository.createRefreshToken.mockResolvedValue({
        id: '1',
        token: 'tok',
        userId: '1',
        expiresAt: new Date(),
        revoked: false,
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'new@test.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result.user.email).toBe('new@test.com');
      expect(result.user.name).toBe('New User');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'existing@test.com',
        name: 'Existing',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.register({
          email: 'existing@test.com',
          password: 'password123',
          name: 'Existing',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      mockRepository.findPasswordByEmail.mockResolvedValue({
        id: '1',
        passwordHash,
      });
      mockRepository.findById.mockResolvedValue({
        id: '1',
        email: 'user@test.com',
        name: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepository.createRefreshToken.mockResolvedValue({
        id: '1',
        token: 'tok',
        userId: '1',
        expiresAt: new Date(),
        revoked: false,
        createdAt: new Date(),
      });

      const result = await service.login({
        email: 'user@test.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('user@test.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockRepository.findPasswordByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct', 10);
      mockRepository.findPasswordByEmail.mockResolvedValue({
        id: '1',
        passwordHash,
      });

      await expect(
        service.login({ email: 'user@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('should return user by id', async () => {
      mockRepository.findById.mockResolvedValue({
        id: '1',
        email: 'me@test.com',
        name: 'Me',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.me('1');

      expect(result.id).toBe('1');
      expect(result.email).toBe('me@test.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.me('999')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('rotate', () => {
    it('should rotate refresh token', async () => {
      mockRepository.findRefreshToken.mockResolvedValue({
        id: '1',
        token: 'old-token',
        userId: '1',
        expiresAt: new Date(Date.now() + 86400000),
        revoked: false,
        createdAt: new Date(),
      });
      mockRepository.revokeRefreshToken.mockResolvedValue(undefined);
      mockRepository.findById.mockResolvedValue({
        id: '1',
        email: 'user@test.com',
        name: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepository.createRefreshToken.mockResolvedValue({
        id: '2',
        token: 'new-tok',
        userId: '1',
        expiresAt: new Date(),
        revoked: false,
        createdAt: new Date(),
      });

      const result = await service.rotate('old-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe('old-token');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockRepository.findRefreshToken.mockResolvedValue(null);

      await expect(service.rotate('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      mockRepository.findRefreshToken.mockResolvedValue({
        id: '1',
        token: 'revoked',
        userId: '1',
        expiresAt: new Date(Date.now() + 86400000),
        revoked: true,
        createdAt: new Date(),
      });

      await expect(service.rotate('revoked')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      mockRepository.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout('token-to-revoke');

      expect(mockRepository.revokeRefreshToken).toHaveBeenCalledWith(
        'token-to-revoke',
      );
    });
  });
});
