import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { UrlsRepository } from './urls.repository';
import { AuthRepository } from '../auth/auth.repository';
import { PrismaModule } from '../../prisma/prisma.module';

describe('UrlsRepository', () => {
  let repository: UrlsRepository;
  let authRepository: AuthRepository;
  let seedUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [UrlsRepository, AuthRepository],
    }).compile();

    repository = module.get(UrlsRepository);
    authRepository = module.get(AuthRepository);

    const user = await authRepository.createUser({
      email: `urls-seed-${randomUUID()}@test.com`,
      passwordHash: 'hashed-password',
      name: 'URLs Seed User',
    });
    seedUserId = user.id;
  });

  describe('createUrl', () => {
    it('should create url with userId', async () => {
      const slug = `create-with-user-${randomUUID()}`;
      const url = await repository.createUrl({
        slug,
        originalUrl: 'https://example.com/1',
        userId: seedUserId,
      });

      expect(url.id).toBeDefined();
      expect(url.slug).toBe(slug);
      expect(url.originalUrl).toBe('https://example.com/1');
      expect(url.userId).toBe(seedUserId);
      expect(url.createdAt).toBeInstanceOf(Date);
      expect(url.updatedAt).toBeInstanceOf(Date);
    });

    it('should create url without userId', async () => {
      const slug = `create-no-user-${randomUUID()}`;
      const url = await repository.createUrl({
        slug,
        originalUrl: 'https://example.com/2',
      });

      expect(url.id).toBeDefined();
      expect(url.slug).toBe(slug);
      expect(url.userId).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return url by slug', async () => {
      const slug = `find-by-slug-${randomUUID()}`;
      await repository.createUrl({
        slug,
        originalUrl: 'https://example.com/find',
        userId: seedUserId,
      });

      const url = await repository.findBySlug(slug);

      expect(url).not.toBeNull();
      expect(url!.slug).toBe(slug);
      expect(url!.originalUrl).toBe('https://example.com/find');
    });

    it('should return null for non-existent slug', async () => {
      const url = await repository.findBySlug('non-existent-slug');
      expect(url).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return url by id', async () => {
      const slug = `find-by-id-${randomUUID()}`;
      const created = await repository.createUrl({
        slug,
        originalUrl: 'https://example.com/id',
        userId: seedUserId,
      });

      const url = await repository.findById(created.id);

      expect(url).not.toBeNull();
      expect(url!.id).toBe(created.id);
      expect(url!.slug).toBe(slug);
    });

    it('should return null for non-existent id', async () => {
      const url = await repository.findById('99999');
      expect(url).toBeNull();
    });
  });

  describe('slugExists', () => {
    it('should return true for existing slug', async () => {
      const slug = `slug-exists-${randomUUID()}`;
      await repository.createUrl({
        slug,
        originalUrl: 'https://example.com/exists',
        userId: seedUserId,
      });

      const exists = await repository.slugExists(slug);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent slug', async () => {
      const exists = await repository.slugExists('non-existent-slug');
      expect(exists).toBe(false);
    });
  });

  describe('deleteUrl', () => {
    it('should delete url by id', async () => {
      const slug = `delete-me-${randomUUID()}`;
      const created = await repository.createUrl({
        slug,
        originalUrl: 'https://example.com/delete',
        userId: seedUserId,
      });

      await repository.deleteUrl(created.id);

      const url = await repository.findById(created.id);
      expect(url).toBeNull();
    });
  });
});
