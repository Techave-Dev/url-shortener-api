import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { JwtStrategy } from './jwt.strategy';
import { IAuthRepository } from '../interfaces/auth.repository.interface';

describe('JwtStrategy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-for-jwt-strategy',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      const mockRepository = mock<IAuthRepository>();

      expect(() => new JwtStrategy(mockRepository)).toThrow(
        'JWT_SECRET environment variable is required',
      );
    });

    it('should construct successfully when JWT_SECRET is set', () => {
      const mockRepository = mock<IAuthRepository>();

      expect(() => new JwtStrategy(mockRepository)).not.toThrow();
    });
  });

  describe('validate', () => {
    let strategy: JwtStrategy;
    const mockRepository = mock<IAuthRepository>();

    const fakeUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: IAuthRepository, useValue: mockRepository },
        ],
      }).compile();

      strategy = module.get(JwtStrategy);
      jest.clearAllMocks();
    });

    it('should return user data when user is found', async () => {
      mockRepository.findById.mockResolvedValue(fakeUser);

      const result = await strategy.validate({
        sub: 'user-1',
        email: 'test@example.com',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should call repository.findById with the payload sub', async () => {
      mockRepository.findById.mockResolvedValue(fakeUser);

      await strategy.validate({ sub: 'user-1', email: 'test@example.com' });

      expect(mockRepository.findById).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'nonexistent', email: 'ghost@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw with the correct error code when user is not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      try {
        await strategy.validate({
          sub: 'nonexistent',
          email: 'ghost@example.com',
        });
        throw new Error('Expected validate to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = (error as UnauthorizedException).getResponse() as {
          code: string;
        };
        expect(response.code).toBe('auth.unauthorized');
      }
    });
  });
});
