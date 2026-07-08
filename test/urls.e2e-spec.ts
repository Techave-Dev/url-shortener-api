import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('URL Stats & Delete (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let otherAccessToken: string;
  let urlId: string;
  const statsSlug = `stats-test-${randomUUID()}`;
  const toDeleteSlug = `to-delete-${randomUUID()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const email1 = `statsuser-${randomUUID()}@test.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      email: email1,
      password: 'password123',
      name: 'Stats User',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email1, password: 'password123' });
    accessToken = loginRes.body.data.accessToken;

    const email2 = `other-${randomUUID()}@test.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      email: email2,
      password: 'password123',
      name: 'Other User',
    });

    const otherLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email2, password: 'password123' });
    otherAccessToken = otherLoginRes.body.data.accessToken;

    const urlRes = await request(app.getHttpServer())
      .post('/shorten')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://example.com/stats-test', slug: statsSlug });
    urlId = urlRes.body.data.url.id;

    await request(app.getHttpServer()).get(`/${statsSlug}`);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /urls/:id/stats', () => {
    it('should reject without auth', () => {
      return request(app.getHttpServer())
        .get(`/urls/${urlId}/stats`)
        .expect(401);
    });

    it('should return stats with valid auth', () => {
      return request(app.getHttpServer())
        .get(`/urls/${urlId}/stats`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Analytics retrieved successfully');
          expect(res.body.data.stats).toBeDefined();
          expect(res.body.data.stats.totalClicks).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(res.body.data.stats.clicksByDate)).toBe(true);
          expect(Array.isArray(res.body.data.stats.clicksByReferrer)).toBe(
            true,
          );
        });
    });

    it('should accept from/to date filters', () => {
      return request(app.getHttpServer())
        .get(`/urls/${urlId}/stats?from=2026-01-01&to=2026-12-31`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /urls/:id', () => {
    let tempUrlId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ url: 'https://example.com/to-delete', slug: toDeleteSlug });
      tempUrlId = res.body.data.url.id;
    });

    it('should reject without auth', () => {
      return request(app.getHttpServer())
        .delete(`/urls/${tempUrlId}`)
        .expect(401);
    });

    it('should reject if not the owner', () => {
      return request(app.getHttpServer())
        .delete(`/urls/${tempUrlId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent URL', () => {
      return request(app.getHttpServer())
        .delete('/urls/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should delete own URL', () => {
      return request(app.getHttpServer())
        .delete(`/urls/${tempUrlId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('URL deleted successfully');
        });
    });
  });
});
