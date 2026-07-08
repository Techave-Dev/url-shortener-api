import { Injectable } from '@nestjs/common';
import {
  IAnalyticsRepository,
  RecordClickInput,
  ClickEvent,
  ClickStats,
} from './interfaces/analytics.repository.interface';
import {
  recordClick,
  getTotalClicks,
  getClicksByDate,
  getClicksByReferrer,
  getStats,
} from '../../generated/prisma/sql';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordClick(data: RecordClickInput): Promise<ClickEvent> {
    const [click] = await this.prisma.$queryRawTyped(
      recordClick(
        BigInt(data.urlId),
        data.referrer ?? 'direct',
        data.userAgent ?? '',
      ),
    );

    if (!click) throw new Error('Failed to record click');

    return Promise.resolve({
      id: click.id.toString(),
      urlId: click.urlId.toString(),
      timestamp: click.createdAt,
      referrer: click.referrer,
    });
  }

  async getTotalClicks(urlId: string): Promise<number> {
    const [result] = await this.prisma.$queryRawTyped(
      getTotalClicks(BigInt(urlId)),
    );
    return Number(result?.totalClicks ?? 0);
  }

  async getClicksByDate(
    urlId: string,
    from?: Date,
    to?: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    const fromStr = from?.toISOString() ?? '';
    const toStr = to?.toISOString() ?? '';
    const rows = await this.prisma.$queryRawTyped(
      getClicksByDate(BigInt(urlId), fromStr, toStr),
    );
    return rows.map((r) => ({
      date: r.date || '',
      count: Number(r.count),
    }));
  }

  async getClicksByReferrer(
    urlId: string,
  ): Promise<Array<{ referrer: string; count: number }>> {
    const rows = await this.prisma.$queryRawTyped(
      getClicksByReferrer(BigInt(urlId)),
    );
    return rows.map((r) => ({
      referrer: r.referrer || '',
      count: Number(r.count),
    }));
  }

  async getStats(urlId: string, from?: Date, to?: Date): Promise<ClickStats> {
    const bigintUrlId = BigInt(urlId);
    const fromStr = from ? from.toISOString() : '';
    const toStr = to ? to.toISOString() : '';
    const [totalRes, dateRes, referrerRes] = await Promise.all([
      this.prisma.$queryRawTyped(getStats(bigintUrlId, fromStr, toStr)),
      this.prisma.$queryRawTyped(getClicksByDate(bigintUrlId, fromStr, toStr)),
      this.prisma.$queryRawTyped(getClicksByReferrer(bigintUrlId)),
    ]);

    return {
      totalClicks: totalRes[0] ? Number(totalRes[0].totalClicks) : 0,
      clicksByDate: dateRes.map((d) => ({
        date: d.date || '',
        count: d.count ? Number(d.count) : 0,
      })),
      clicksByReferrer: referrerRes.map((r) => ({
        referrer: r.referrer || 'direct',
        count: r.count ? Number(r.count) : 0,
      })),
    };
  }
}
