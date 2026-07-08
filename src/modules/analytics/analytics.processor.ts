import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { IAnalyticsService } from './interfaces/analytics.service.interface';

interface ClickJobData {
  urlId: string;
  referrer?: string;
  userAgent?: string;
}

@Processor('click-events')
export class AnalyticsProcessor extends WorkerHost {
  constructor(
    @Inject(IAnalyticsService)
    private readonly analyticsService: IAnalyticsService,
  ) {
    super();
  }

  async process(job: Job<ClickJobData>): Promise<void> {
    const { urlId, referrer, userAgent } = job.data;
    await this.analyticsService.recordClick(urlId, referrer, userAgent);
  }
}
