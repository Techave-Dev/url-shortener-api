import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CreateUrlDto } from './dto/create-url.dto.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ApiResponse } from '../../common/types/api-response.js';
import { IUrlsService } from './interfaces/urls.service.interface.js';
import { IAnalyticsService } from '../analytics/interfaces/analytics.service.interface.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('URLs')
@Controller()
export class UrlsController {
  constructor(
    @Inject(IUrlsService) private readonly urlsService: IUrlsService,
    @Inject(IAnalyticsService)
    private readonly analyticsService: IAnalyticsService,
    @InjectQueue('click-events')
    private readonly clickQueue: Queue,
  ) {}

  @Post('shorten')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a shortened URL' })
  @ApiBody({ type: CreateUrlDto })
  @SwaggerApiResponse({
    status: 201,
    description: 'URL shortened successfully',
  })
  @SwaggerApiResponse({ status: 400, description: 'Validation failed' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerApiResponse({ status: 409, description: 'Slug already exists' })
  async createUrl(
    @Body(new ZodValidationPipe(CreateUrlDto.schema)) dto: CreateUrlDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse> {
    const url = await this.urlsService.createUrl(dto, userId);
    return new ApiResponse('URL shortened successfully', { url });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Redirect to original URL' })
  @SwaggerApiResponse({ status: 302, description: 'Redirect to original URL' })
  @SwaggerApiResponse({ status: 404, description: 'URL not found' })
  async redirect(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<void> {
    const url = await this.urlsService.findBySlug(slug);

    if (!url) {
      throw new NotFoundException({
        code: 'urls.not_found',
        message: 'URL not found',
      });
    }

    const referrer = req.headers.referer;
    const userAgent = req.headers['user-agent'];
    await this.clickQueue.add('record-click', {
      urlId: url.id,
      referrer: typeof referrer === 'string' ? referrer : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });

    return res.redirect(302, url.originalUrl);
  }

  @Get('urls/:id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get click analytics for a URL' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
  })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ApiResponse> {
    const url = await this.urlsService.findById(id);

    if (!url) {
      throw new NotFoundException({
        code: 'urls.not_found',
        message: 'URL not found',
      });
    }

    if (url.userId !== userId) {
      throw new ForbiddenException({
        code: 'urls.forbidden',
        message: 'You do not own this URL',
      });
    }
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const stats = await this.analyticsService.getStats(id, fromDate, toDate);
    return new ApiResponse('Analytics retrieved successfully', { stats });
  }

  @Delete('urls/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a shortened URL' })
  @SwaggerApiResponse({ status: 200, description: 'URL deleted successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerApiResponse({ status: 403, description: 'You do not own this URL' })
  @SwaggerApiResponse({ status: 404, description: 'URL not found' })
  async deleteUrl(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse> {
    await this.urlsService.deleteUrl(id, userId);
    return new ApiResponse('URL deleted successfully');
  }
}
