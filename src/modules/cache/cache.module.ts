import { Module, Global, Inject, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CacheService } from './cache.service';
import { ICacheService } from './interfaces/cache.service.interface';

@Global()
@Module({
  providers: [
    {
      provide: Redis,
      useFactory: (): Redis =>
        new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
    {
      provide: ICacheService,
      useClass: CacheService,
    },
  ],
  exports: [ICacheService],
})
export class CacheModule implements OnModuleDestroy {
  constructor(@Inject(Redis) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
