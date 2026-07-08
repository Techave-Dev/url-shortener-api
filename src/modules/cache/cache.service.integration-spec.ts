import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

    await new Promise<void>((resolve, reject) => {
      redis.once('ready', resolve);
      redis.once('error', reject);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: Redis,
          useValue: redis,
        },
        CacheService,
      ],
    }).compile();

    service = module.get(CacheService);
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('isConnected', () => {
    it('should return true when connected', () => {
      expect(service.isConnected()).toBe(true);
    });
  });

  describe('set and get', () => {
    it('should set and get a string value', async () => {
      await service.set('test:string', 'hello');
      const result = await service.get<string>('test:string');
      expect(result).toBe('hello');
    });

    it('should set and get an object value', async () => {
      const obj = { name: 'test', count: 42 };
      await service.set('test:object', obj);
      const result = await service.get<typeof obj>('test:object');
      expect(result).toEqual(obj);
    });

    it('should return null for non-existent key', async () => {
      const result = await service.get('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('set with TTL', () => {
    it('should expire key after TTL', async () => {
      await service.set('test:ttl', 'expire-me', 1);
      const immediate = await service.get<string>('test:ttl');
      expect(immediate).toBe('expire-me');

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const expired = await service.get<string>('test:ttl');
      expect(expired).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await service.set('test:del', 'delete-me');
      await service.del('test:del');

      const result = await service.get('test:del');
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(service.del('non-existent')).resolves.not.toThrow();
    });
  });
});
