import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller';
import { UrlsService } from './urls.service';
import { UrlsRepository } from './urls.repository';
import { IUrlsService } from './interfaces/urls.service.interface';
import { IUrlsRepository } from './interfaces/urls.repository.interface';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [UrlsController],
  providers: [
    {
      provide: IUrlsService,
      useClass: UrlsService,
    },
    {
      provide: IUrlsRepository,
      useClass: UrlsRepository,
    },
  ],
  exports: [IUrlsService],
})
export class UrlsModule {}
