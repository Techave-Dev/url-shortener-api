import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const testEmail = `auth-${randomUUID()}@test.com`;
  const testPassword = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('User registered successfully');
          expect(res.body.data.user.email).toBe(testEmail);
          expect(res.body.data.accessToken).toBeDefined();
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
        })
        .expect(409);
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: testPassword,
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `weak-${randomUUID()}@test.com`,
          password: '123',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should reject empty body', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Login successful');
          expect(res.body.data.accessToken).toBeDefined();
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testPassword,
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        email: testEmail,
        password: testPassword,
      });
      accessToken = res.body.data.accessToken;
    });

    it('should return current user', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.user.email).toBe(testEmail);
        });
    });

    it('should reject without token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/rotate', () => {
    function extractRefreshTokenCookie(res: request.Response): string {
      const rawCookies: unknown = res.headers['set-cookie'];

      const cookies =
        typeof rawCookies === 'string'
          ? [rawCookies]
          : Array.isArray(rawCookies)
            ? rawCookies.filter(
                (cookie): cookie is string => typeof cookie === 'string',
              )
            : [];

      const refreshCookie = cookies.find((cookie) =>
        cookie.startsWith('refresh_token='),
      );

      if (!refreshCookie) {
        throw new Error('refresh_token cookie not found');
      }

      return refreshCookie;
    }

    async function loginAndGetRefreshCookie(): Promise<string> {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      return extractRefreshTokenCookie(loginRes);
    }

    it('should rotate tokens when a valid refresh token cookie is provided', async () => {
      const refreshCookie = await loginAndGetRefreshCookie();

      const res = await request(app.getHttpServer())
        .post('/auth/rotate')
        .set('Cookie', refreshCookie)
        .expect(200);

      expect(res.body.message).toBe('Token rotated successfully');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should set a new refresh_token cookie after rotation', async () => {
      const refreshCookie = await loginAndGetRefreshCookie();

      const res = await request(app.getHttpServer())
        .post('/auth/rotate')
        .set('Cookie', refreshCookie)
        .expect(200);

      const rawCookies = res.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];

      expect(
        cookies.some(
          (cookie) =>
            typeof cookie === 'string' && cookie.startsWith('refresh_token='),
        ),
      ).toBe(true);
    });

    it('should reject rotation without a refresh token cookie', () => {
      return request(app.getHttpServer()).post('/auth/rotate').expect(401);
    });

    it('should reject rotation with an invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/rotate')
        .set('Cookie', 'refresh_token=invalid-token')
        .expect(401);
    });

    it('should reject reusing a refresh token after it has been rotated', async () => {
      const refreshCookie = await loginAndGetRefreshCookie();

      const rotateRes = await request(app.getHttpServer())
        .post('/auth/rotate')
        .set('Cookie', refreshCookie)
        .expect(200);

      const newRefreshCookie = extractRefreshTokenCookie(rotateRes);

      expect(newRefreshCookie).not.toEqual(refreshCookie);

      await request(app.getHttpServer())
        .post('/auth/rotate')
        .set('Cookie', refreshCookie)
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and clear the refresh_token cookie', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      const rawCookies = loginRes.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
      const refreshCookie = cookies.find(
        (cookie): cookie is string =>
          typeof cookie === 'string' && cookie.startsWith('refresh_token='),
      );

      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', refreshCookie ?? '')
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Logged out successfully');
        });
    });

    it('should reject using the refresh token after logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      const rawCookies = loginRes.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
      const refreshCookie = cookies.find(
        (cookie): cookie is string =>
          typeof cookie === 'string' && cookie.startsWith('refresh_token='),
      );

      if (!refreshCookie) {
        throw new Error('refresh_token cookie not found in response');
      }

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', refreshCookie)
        .expect(200);

      return request(app.getHttpServer())
        .post('/auth/rotate')
        .set('Cookie', refreshCookie)
        .expect(401);
    });

    it('should succeed even without a refresh token cookie', () => {
      return request(app.getHttpServer()).post('/auth/logout').expect(200);
    });
  });
});
