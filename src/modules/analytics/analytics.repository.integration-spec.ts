import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsRepository } from './analytics.repository';
import { UrlsRepository } from '../urls/urls.repository';
import { AuthRepository } from '../auth/auth.repository';
import { PrismaModule } from '../../prisma/prisma.module';

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;
  let urlsRepository: UrlsRepository;
  let authRepository: AuthRepository;
  let urlId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AnalyticsRepository, UrlsRepository, AuthRepository],
    }).compile();

    repository = module.get(AnalyticsRepository);
    urlsRepository = module.get(UrlsRepository);
    authRepository = module.get(AuthRepository);

    const user = await authRepository.createUser({
      email: `analytics-seed-${randomUUID()}@test.com`,
      passwordHash: 'hashed-password',
      name: 'Analytics Seed User',
    });

    const slug = `analytics-test-${randomUUID()}`;
    const url = await urlsRepository.createUrl({
      slug,
      originalUrl: 'https://example.com/analytics',
      userId: user.id,
    });
    urlId = url.id;
  });

  describe('recordClick', () => {
    it('should record a click and return event', async () => {
      const event = await repository.recordClick({
        urlId,
        referrer: 'https://google.com',
        userAgent: 'test-agent',
      });

      expect(event.id).toBeDefined();
      expect(event.urlId).toBe(urlId);
      expect(event.referrer).toBe('https://google.com');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should record click without optional fields', async () => {
      const event = await repository.recordClick({
        urlId,
      });

      expect(event.id).toBeDefined();
      expect(event.urlId).toBe(urlId);
    });
  });

  describe('getTotalClicks', () => {
    it('should return total click count', async () => {
      const total = await repository.getTotalClicks(urlId);
      expect(total).toBeGreaterThanOrEqual(2);
    });

    it('should return 0 for url with no clicks', async () => {
      const slug = `no-clicks-${randomUUID()}`;
      const newUrl = await urlsRepository.createUrl({
        slug,
        originalUrl: 'https://example.com/noclicks',
      });

      const total = await repository.getTotalClicks(newUrl.id);
      expect(total).toBe(0);
    });
  });

  describe('getClicksByDate', () => {
    it('should return clicks grouped by date', async () => {
      const result = await repository.getClicksByDate(urlId);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const first = result[0];
        expect(first!.date).toBeDefined();
        expect(first!.count).toBeGreaterThan(0);
      }
    });

    it('should filter by date range', async () => {
      const from = new Date('2020-01-01');
      const to = new Date('2030-12-31');

      const result = await repository.getClicksByDate(urlId, from, to);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getClicksByReferrer', () => {
    it('should return clicks grouped by referrer', async () => {
      const result = await repository.getClicksByReferrer(urlId);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const first = result[0];
        expect(first!.referrer).toBeDefined();
        expect(first!.count).toBeGreaterThan(0);
      }
    });
  });

  describe('getStats', () => {
    it('should return combined stats', async () => {
      const stats = await repository.getStats(urlId);

      expect(stats.totalClicks).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(stats.clicksByDate)).toBe(true);
      expect(Array.isArray(stats.clicksByReferrer)).toBe(true);
    });

    it('should filter stats by date range', async () => {
      const from = new Date('2020-01-01');
      const to = new Date('2030-12-31');

      const stats = await repository.getStats(urlId, from, to);
      expect(stats.totalClicks).toBeGreaterThanOrEqual(0);
    });
  });
});
