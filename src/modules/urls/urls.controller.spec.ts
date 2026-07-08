import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import type { Response, Request } from 'express';
import { UrlsController } from './urls.controller';
import { IUrlsService } from './interfaces/urls.service.interface';
import { IAnalyticsService } from '../analytics/interfaces/analytics.service.interface';
import { getQueueToken } from '@nestjs/bullmq';

describe('UrlsController', () => {
  let controller: UrlsController;
  const mockUrlsService = mock<IUrlsService>();
  const mockAnalyticsService = mock<IAnalyticsService>();
  const mockQueue = { add: jest.fn() };

  const fakeUrl = {
    id: 'url-1',
    slug: 'abc123',
    originalUrl: 'https://example.com',
    userId: 'user-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlsController],
      providers: [
        { provide: IUrlsService, useValue: mockUrlsService },
        { provide: IAnalyticsService, useValue: mockAnalyticsService },
        { provide: getQueueToken('click-events'), useValue: mockQueue },
      ],
    }).compile();

    controller = module.get(UrlsController);
    jest.clearAllMocks();
  });

  describe('createUrl', () => {
    it('should create a url and return it wrapped in ApiResponse', async () => {
      mockUrlsService.createUrl.mockResolvedValue(fakeUrl);

      const result = await controller.createUrl(
        { url: 'https://example.com' },
        'user-1',
      );

      expect(mockUrlsService.createUrl).toHaveBeenCalledWith(
        { url: 'https://example.com' },
        'user-1',
      );
      expect(result.message).toBe('URL shortened successfully');
      expect(result.data).toEqual({ url: fakeUrl });
    });
  });

  describe('redirect', () => {
    function createMockResponse(): Response {
      return {
        redirect: jest.fn(),
      } as unknown as Response;
    }

    function createMockRequest(headers: Record<string, string> = {}): Request {
      return { headers } as unknown as Request;
    }

    it('should redirect to the original url when slug is found', async () => {
      mockUrlsService.findBySlug.mockResolvedValue(fakeUrl);
      const res = createMockResponse();
      const req = createMockRequest({ referer: 'https://google.com' });

      await controller.redirect('abc123', res, req);

      expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com');
    });

    it('should enqueue a click event with referrer and user agent', async () => {
      mockUrlsService.findBySlug.mockResolvedValue(fakeUrl);
      const res = createMockResponse();
      const req = createMockRequest({
        referer: 'https://google.com',
        'user-agent': 'Mozilla/5.0',
      });

      await controller.redirect('abc123', res, req);

      expect(mockQueue.add).toHaveBeenCalledWith('record-click', {
        urlId: 'url-1',
        referrer: 'https://google.com',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      mockUrlsService.findBySlug.mockResolvedValue(null);
      const res = createMockResponse();
      const req = createMockRequest();

      await expect(
        controller.redirect('nonexistent', res, req),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return stats when the user owns the url', async () => {
      mockUrlsService.findById.mockResolvedValue(fakeUrl);
      mockAnalyticsService.getStats.mockResolvedValue({
        totalClicks: 10,
        clicksByDate: [],
        clicksByReferrer: [],
      });

      const result = await controller.getStats('url-1', 'user-1');

      expect(result.message).toBe('Analytics retrieved successfully');
      expect(mockAnalyticsService.getStats).toHaveBeenCalledWith(
        'url-1',
        undefined,
        undefined,
      );
    });

    it('should pass parsed date filters to the analytics service', async () => {
      mockUrlsService.findById.mockResolvedValue(fakeUrl);
      mockAnalyticsService.getStats.mockResolvedValue({
        totalClicks: 0,
        clicksByDate: [],
        clicksByReferrer: [],
      });

      await controller.getStats('url-1', 'user-1', '2026-01-01', '2026-01-31');

      expect(mockAnalyticsService.getStats).toHaveBeenCalledWith(
        'url-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );
    });

    it('should throw NotFoundException when url does not exist', async () => {
      mockUrlsService.findById.mockResolvedValue(null);

      await expect(
        controller.getStats('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockAnalyticsService.getStats).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the url', async () => {
      mockUrlsService.findById.mockResolvedValue(fakeUrl);

      await expect(
        controller.getStats('url-1', 'different-user'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockAnalyticsService.getStats).not.toHaveBeenCalled();
    });
  });

  describe('deleteUrl', () => {
    it('should delete the url and return a success message', async () => {
      mockUrlsService.deleteUrl.mockResolvedValue(undefined);

      const result = await controller.deleteUrl('url-1', 'user-1');

      expect(mockUrlsService.deleteUrl).toHaveBeenCalledWith('url-1', 'user-1');
      expect(result.message).toBe('URL deleted successfully');
    });

    it('should propagate ForbiddenException from the service', async () => {
      mockUrlsService.deleteUrl.mockRejectedValue(
        new ForbiddenException({
          code: 'urls.forbidden',
          message: 'You do not own this URL',
        }),
      );

      await expect(controller.deleteUrl('url-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
