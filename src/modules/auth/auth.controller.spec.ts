import { Test, TestingModule } from '@nestjs/testing';
import { mock } from 'jest-mock-extended';
import { AuthController } from './auth.controller';
import {
  IAuthService,
  AuthTokens,
  AuthUser,
} from './interfaces/auth.service.interface';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuthService = mock<IAuthService>();

  const mockUser: AuthUser = {
    id: '1',
    email: 'test@test.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens: AuthTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: IAuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      mockAuthService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const dto = {
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      };
      const result = await controller.register(dto);

      expect(result.message).toBe('User registered successfully');
      expect(result.data).toEqual({
        user: mockUser,
        accessToken: 'mock-access-token',
      });
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should login with valid credentials and set cookie', async () => {
      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const dto = { email: 'test@test.com', password: 'password123' };
      const res = { cookie: jest.fn() } as never;
      const result = await controller.login(dto, res);

      expect(result.message).toBe('Login successful');
      expect(result.data).toEqual({
        user: mockUser,
        accessToken: 'mock-access-token',
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('rotate', () => {
    it('should rotate tokens', async () => {
      mockAuthService.rotate.mockResolvedValue(mockTokens);

      const req = { cookies: { refresh_token: 'old-token' } } as never;
      const res = { cookie: jest.fn() } as never;
      const result = await controller.rotate(req, res);

      expect(result.message).toBe('Token rotated successfully');
      expect(result.data).toEqual({
        accessToken: 'mock-access-token',
      });
      expect(mockAuthService.rotate).toHaveBeenCalledWith('old-token');
    });
  });

  describe('logout', () => {
    it('should logout and clear cookie', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const req = { cookies: { refresh_token: 'test-token' } } as never;
      const res = { clearCookie: jest.fn() } as never;
      const result = await controller.logout(req, res);

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).toHaveBeenCalledWith('test-token');
    });
  });

  describe('me', () => {
    it('should return current user', async () => {
      mockAuthService.me.mockResolvedValue(mockUser);

      const result = await controller.me('1');

      expect(result.message).toBe('User retrieved successfully');
      expect(result.data).toEqual({ user: mockUser });
      expect(mockAuthService.me).toHaveBeenCalledWith('1');
    });
  });
});
