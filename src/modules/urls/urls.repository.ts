import { Injectable } from '@nestjs/common';
import {
  IUrlsRepository,
  CreateUrlInput,
  Url,
} from './interfaces/urls.repository.interface';
import {
  createUrl,
  createUrlAnonymous,
  findBySlug,
  deleteUrl,
  findUrlById,
  slugExists,
} from '../../generated/prisma/sql';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UrlsRepository implements IUrlsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUrl(data: CreateUrlInput): Promise<Url> {
    const [url] = data.userId
      ? await this.prisma.$queryRawTyped(
          createUrl(data.slug, data.originalUrl, BigInt(data.userId)),
        )
      : await this.prisma.$queryRawTyped(
          createUrlAnonymous(data.slug, data.originalUrl),
        );

    if (!url) {
      throw new Error('Failed to create url');
    }

    return {
      id: url.id.toString(),
      slug: url.slug,
      originalUrl: url.originalUrl,
      userId: url.userId?.toString() ?? null,
      createdAt: url.createdAt,
      updatedAt: url.updatedAt,
    };
  }

  async findBySlug(slug: string): Promise<Url | null> {
    const [url] = await this.prisma.$queryRawTyped(findBySlug(slug));

    if (!url) {
      return null;
    }

    return {
      id: url.id.toString(),
      slug: url.slug,
      originalUrl: url.originalUrl,
      userId: url.userId?.toString() ?? null,
      createdAt: url.createdAt,
      updatedAt: url.updatedAt,
    };
  }

  async findById(id: string): Promise<Url | null> {
    const [url] = await this.prisma.$queryRawTyped(findUrlById(BigInt(id)));

    if (!url) {
      return null;
    }

    return {
      id: url.id.toString(),
      slug: url.slug,
      originalUrl: url.originalUrl,
      userId: url.userId?.toString() ?? null,
      createdAt: url.createdAt,
      updatedAt: url.updatedAt,
    };
  }

  async deleteUrl(id: string): Promise<void> {
    await this.prisma.$queryRawTyped(deleteUrl(BigInt(id)));
  }

  async slugExists(slug: string): Promise<boolean> {
    const [result] = await this.prisma.$queryRawTyped(slugExists(slug));
    return result?.exists ?? false;
  }
}
