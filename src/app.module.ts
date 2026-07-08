import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UrlsModule } from './modules/urls/urls.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CacheModule } from './modules/cache/cache.module';
import { ZodExceptionFilter } from './common/filters/zod-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    PrismaModule,
    AuthModule,
    UrlsModule,
    AnalyticsModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: ZodExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
