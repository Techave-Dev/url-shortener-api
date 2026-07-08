import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { IAnalyticsService } from './interfaces/analytics.service.interface.js';
import { IAnalyticsRepository } from './interfaces/analytics.repository.interface.js';
import { AnalyticsProcessor } from './analytics.processor.js';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'click-events',
    }),
  ],
  providers: [
    {
      provide: IAnalyticsService,
      useClass: AnalyticsService,
    },
    {
      provide: IAnalyticsRepository,
      useClass: AnalyticsRepository,
    },
    AnalyticsProcessor,
  ],
  exports: [IAnalyticsService, BullModule],
})
export class AnalyticsModule {}
