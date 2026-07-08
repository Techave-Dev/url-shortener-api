import { Injectable } from '@nestjs/common';
import { ICacheService } from './interfaces/cache.service.interface';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService implements ICacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, stringValue, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, stringValue);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  isConnected(): boolean {
    return this.redis.status === 'ready';
  }
}
