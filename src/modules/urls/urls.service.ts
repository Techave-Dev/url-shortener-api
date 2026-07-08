import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IUrlsService, UrlResponse } from './interfaces/urls.service.interface';
import { CreateUrlDto } from './dto/create-url.dto';
import { IUrlsRepository } from './interfaces/urls.repository.interface';
import { randomBytes } from 'node:crypto';
import { ICacheService } from '../cache/interfaces/cache.service.interface';

@Injectable()
export class UrlsService implements IUrlsService {
  constructor(
    @Inject(IUrlsRepository) private readonly urlsRepository: IUrlsRepository,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {}

  private isUniqueConstraintError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    if ('code' in error) {
      if (error.code === '23505' || error.code === 'P2002') {
        return true;
      }

      if (error.code === 'P2010' && 'meta' in error) {
        const meta = error.meta;

        if (
          typeof meta === 'object' &&
          meta !== null &&
          'driverAdapterError' in meta
        ) {
          const driverAdapterError = meta.driverAdapterError;

          if (
            typeof driverAdapterError === 'object' &&
            driverAdapterError !== null &&
            'cause' in driverAdapterError
          ) {
            const cause = driverAdapterError.cause;

            if (
              typeof cause === 'object' &&
              cause !== null &&
              'originalCode' in cause
            ) {
              return cause.originalCode === '23505';
            }
          }
        }
      }
    }

    return false;
  }

  async createUrl(dto: CreateUrlDto, userId?: string): Promise<UrlResponse> {
    const slug = dto.slug ?? this.generateSlug();

    try {
      return await this.urlsRepository.createUrl({
        slug,
        originalUrl: dto.url,
        userId,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'urls.slug.exists',
          message: 'Slug already exists',
        });
      }
      throw error;
    }
  }

  async findBySlug(slug: string): Promise<UrlResponse | null> {
    const cacheKey = `url:slug:${slug}`;
    const cached = await this.cacheService.get<UrlResponse>(cacheKey);
    if (cached) return cached;
    const url = await this.urlsRepository.findBySlug(slug);

    if (url) {
      await this.cacheService.set(cacheKey, url, 3600);
    }

    return url;
  }

  async findById(id: string): Promise<UrlResponse | null> {
    return this.urlsRepository.findById(id);
  }

  async deleteUrl(id: string, userId: string): Promise<void> {
    const url = await this.urlsRepository.findById(id);

    if (!url) {
      throw new NotFoundException('URL not found');
    }

    if (url.userId !== userId) {
      throw new ForbiddenException({
        code: 'urls.forbidden',
        message: 'You do not own this URL',
      });
    }

    await this.urlsRepository.deleteUrl(id);
    await this.cacheService.del(`url:slug:${url.slug}`);
  }

  generateSlug(): string {
    return randomBytes(6)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 7);
  }
}
