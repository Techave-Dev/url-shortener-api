import { Test, TestingModule } from '@nestjs/testing';
import { mock } from 'jest-mock-extended';
import { UrlsService } from './urls.service';
import { IUrlsRepository } from './interfaces/urls.repository.interface';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ICacheService } from '../cache/interfaces/cache.service.interface';

describe('UrlsService', () => {
  let service: UrlsService;
  const mockRepository = mock<IUrlsRepository>();
  const mockCacheService = mock<ICacheService>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlsService,
        { provide: IUrlsRepository, useValue: mockRepository },
        { provide: ICacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get(UrlsService);
    jest.clearAllMocks();
  });

  describe('createUrl', () => {
    it('should create a short URL with auto-generated slug', async () => {
      mockRepository.slugExists.mockResolvedValue(false);
      mockRepository.createUrl.mockResolvedValue({
        id: '1',
        slug: 'abc1234',
        originalUrl: 'https://example.com',
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createUrl({ url: 'https://example.com' });

      expect(result.slug).toBeDefined();
      expect(result.originalUrl).toBe('https://example.com');
    });

    it('should create a short URL with custom slug', async () => {
      mockRepository.slugExists.mockResolvedValue(false);
      mockRepository.createUrl.mockResolvedValue({
        id: '1',
        slug: 'custom',
        originalUrl: 'https://example.com',
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createUrl({
        url: 'https://example.com',
        slug: 'custom',
      });

      expect(result.slug).toBe('custom');
    });

    it('should throw ConflictException for duplicate slug', async () => {
      const dbError = { code: '23505' };
      mockRepository.createUrl.mockRejectedValue(dbError);

      await expect(
        service.createUrl({ url: 'https://example.com', slug: 'taken' }),
      ).rejects.toThrow(ConflictException);

      expect(mockRepository.createUrl).toHaveBeenCalledWith({
        originalUrl: 'https://example.com',
        slug: 'taken',
        userId: undefined,
      });
    });
  });

  describe('findBySlug', () => {
    it('should return URL if found', async () => {
      mockRepository.findBySlug.mockResolvedValue({
        id: '1',
        slug: 'abc',
        originalUrl: 'https://example.com',
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findBySlug('abc');

      expect(result).not.toBeNull();
      expect(result!.originalUrl).toBe('https://example.com');
    });

    it('should return null if not found', async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      const result = await service.findBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return URL if found', async () => {
      mockRepository.findById.mockResolvedValue({
        id: '1',
        slug: 'abc',
        originalUrl: 'https://example.com',
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById('1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('1');
    });

    it('should return null if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('deleteUrl', () => {
    it('should delete URL if owner', async () => {
      mockRepository.findById.mockResolvedValue({
        id: '1',
        slug: 'abc',
        originalUrl: 'https://example.com',
        userId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepository.deleteUrl.mockResolvedValue(undefined);

      await service.deleteUrl('1', '1');

      expect(mockRepository.deleteUrl).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if URL not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deleteUrl('999', '1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockRepository.findById.mockResolvedValue({
        id: '1',
        slug: 'abc',
        originalUrl: 'https://example.com',
        userId: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.deleteUrl('1', '1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('generateSlug', () => {
    it('should generate a 7-character alphanumeric slug', () => {
      const slug = service.generateSlug();

      expect(slug).toHaveLength(7);
      expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });
});
