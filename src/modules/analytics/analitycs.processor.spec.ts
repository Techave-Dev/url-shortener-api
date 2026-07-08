import { Test, TestingModule } from '@nestjs/testing';
import { mock } from 'jest-mock-extended';
import { Job } from 'bullmq';
import { AnalyticsProcessor } from './analytics.processor';
import { IAnalyticsService } from './interfaces/analytics.service.interface';

describe('AnalyticsProcessor', () => {
  let processor: AnalyticsProcessor;
  const mockAnalyticsService = mock<IAnalyticsService>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsProcessor,
        { provide: IAnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    processor = module.get(AnalyticsProcessor);
    jest.clearAllMocks();
  });

  it('should call recordClick with data from the job', async () => {
    const job = {
      data: {
        urlId: 'url-1',
        referrer: 'https://google.com',
        userAgent: 'Mozilla/5.0',
      },
    } as Job<{ urlId: string; referrer?: string; userAgent?: string }>;

    await processor.process(job);

    expect(mockAnalyticsService.recordClick).toHaveBeenCalledWith(
      'url-1',
      'https://google.com',
      'Mozilla/5.0',
    );
  });

  it('should call recordClick even when referrer and userAgent are undefined', async () => {
    const job = {
      data: { urlId: 'url-1' },
    } as Job<{ urlId: string; referrer?: string; userAgent?: string }>;

    await processor.process(job);

    expect(mockAnalyticsService.recordClick).toHaveBeenCalledWith(
      'url-1',
      undefined,
      undefined,
    );
  });

  it('should propagate errors thrown by the analytics service', async () => {
    mockAnalyticsService.recordClick.mockRejectedValue(
      new Error('Database connection failed'),
    );

    const job = {
      data: { urlId: 'url-1' },
    } as Job<{ urlId: string; referrer?: string; userAgent?: string }>;

    await expect(processor.process(job)).rejects.toThrow(
      'Database connection failed',
    );
  });
});
