import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthRepository } from './auth.repository';
import { PrismaModule } from '../../prisma/prisma.module';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let seedUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AuthRepository],
    }).compile();

    repository = module.get(AuthRepository);

    const user = await repository.createUser({
      email: `seed-${randomUUID()}@test.com`,
      passwordHash: 'hashed-password',
      name: 'Seed User',
    });
    seedUserId = user.id;
  });

  describe('createUser', () => {
    it('should create and return a new user', async () => {
      const email = `test-${randomUUID()}@test.com`;
      const user = await repository.createUser({
        email,
        passwordHash: 'hashed-password',
        name: 'Test User',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.name).toBe('Test User');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const email = `find-${randomUUID()}@test.com`;
      await repository.createUser({
        email,
        passwordHash: 'hashed-password',
        name: 'Find User',
      });

      const user = await repository.findByEmail(email);

      expect(user).not.toBeNull();
      expect(user!.email).toBe(email);
    });

    it('should return null for non-existent email', async () => {
      const user = await repository.findByEmail('nonexistent@test.com');
      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const email = `byid-${randomUUID()}@test.com`;
      const created = await repository.createUser({
        email,
        passwordHash: 'hashed-password',
        name: 'ById User',
      });

      const user = await repository.findById(created.id);

      expect(user).not.toBeNull();
      expect(user!.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const user = await repository.findById('999');
      expect(user).toBeNull();
    });
  });

  describe('findPasswordByEmail', () => {
    it('should return id and passwordHash', async () => {
      const email = `pwd-${randomUUID()}@test.com`;
      await repository.createUser({
        email,
        passwordHash: 'secret-hash',
        name: 'Pwd User',
      });

      const result = await repository.findPasswordByEmail(email);

      expect(result).not.toBeNull();
      expect(result!.id).toBeDefined();
      expect(result!.passwordHash).toBe('secret-hash');
    });

    it('should return null for non-existent email', async () => {
      const result = await repository.findPasswordByEmail('no@test.com');
      expect(result).toBeNull();
    });
  });

  describe('createRefreshToken', () => {
    it('should create and return a refresh token', async () => {
      const token = `refresh-${randomUUID()}`;
      const result = await repository.createRefreshToken({
        token,
        userId: seedUserId,
        expiresAt: new Date('2026-12-31'),
      });

      expect(result.id).toBeDefined();
      expect(result.token).toBe(token);
      expect(result.userId).toBe(seedUserId);
      expect(result.revoked).toBe(false);
    });
  });

  describe('findRefreshToken', () => {
    it('should return token by value', async () => {
      const token = `find-token-${randomUUID()}`;
      await repository.createRefreshToken({
        token,
        userId: seedUserId,
        expiresAt: new Date('2026-12-31'),
      });

      const found = await repository.findRefreshToken(token);

      expect(found).not.toBeNull();
      expect(found!.token).toBe(token);
    });

    it('should return null for non-existent token', async () => {
      const found = await repository.findRefreshToken('no-token');
      expect(found).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should mark token as revoked', async () => {
      const token = `revoke-me-${randomUUID()}`;
      await repository.createRefreshToken({
        token,
        userId: seedUserId,
        expiresAt: new Date('2026-12-31'),
      });

      await repository.revokeRefreshToken(token);

      const result = await repository.findRefreshToken(token);
      expect(result!.revoked).toBe(true);
    });
  });

  describe('revokeAllRefreshTokens', () => {
    let userId: string;
    const token1 = `user-token-1-${randomUUID()}`;
    const token2 = `user-token-2-${randomUUID()}`;

    beforeAll(async () => {
      const user = await repository.createUser({
        email: `revoke-all-${randomUUID()}@test.com`,
        passwordHash: 'hashed-password',
        name: 'Revoke All User',
      });
      userId = user.id;
    });

    it('should revoke all tokens for a user', async () => {
      await repository.createRefreshToken({
        token: token1,
        userId,
        expiresAt: new Date('2026-12-31'),
      });
      await repository.createRefreshToken({
        token: token2,
        userId,
        expiresAt: new Date('2026-12-31'),
      });

      await repository.revokeAllRefreshTokens(userId);

      const t1 = await repository.findRefreshToken(token1);
      const t2 = await repository.findRefreshToken(token2);
      expect(t1!.revoked).toBe(true);
      expect(t2!.revoked).toBe(true);
    });
  });
});
