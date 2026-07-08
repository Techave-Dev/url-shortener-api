import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('URLs (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  const customSlug = `custom-slug-${randomUUID()}`;
  const duplicateSlug = `dupe-slug-${randomUUID()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const email = `urluser-${randomUUID()}@test.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password: 'password123',
      name: 'URL User',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'password123',
      });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /shorten', () => {
    it('should create short URL with auto slug', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('URL shortened successfully');
          expect(res.body.data.url.slug).toBeDefined();
          expect(res.body.data.url.originalUrl).toBe('https://example.com');
        });
    });

    it('should create short URL with custom slug', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com',
          slug: customSlug,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.url.slug).toBe(customSlug);
        });
    });

    it('should reject duplicate slug', async () => {
      await request(app.getHttpServer())
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com',
          slug: duplicateSlug,
        });

      return request(app.getHttpServer())
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com',
          slug: duplicateSlug,
        })
        .expect(409);
    });

    it('should reject invalid URL', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'not-a-url',
        })
        .expect(400);
    });

    it('should reject empty body', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .send({
          url: 'https://example.com',
        })
        .expect(401);
    });
  });

  describe('GET /:slug', () => {
    let slug: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/shorten')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com',
        });
      slug = res.body.data.url.slug;
    });

    it('should redirect to original URL', () => {
      return request(app.getHttpServer())
        .get(`/${slug}`)
        .expect(302)
        .expect('Location', 'https://example.com');
    });

    it('should return 404 for unknown slug', () => {
      return request(app.getHttpServer()).get('/nonexistent').expect(404);
    });
  });
});
