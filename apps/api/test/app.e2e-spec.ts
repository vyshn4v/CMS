import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('App & Public Render API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/render (Security & Validation)', () => {
    it('should reject requests without an Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/render')
        .send({ templateId: 'non-existent' })
        .expect(401);

      expect(response.body).toHaveProperty('status', 401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error.message).toContain('Missing API Key');
    });

    it('should reject requests with an invalid API key token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/render')
        .set('Authorization', 'Bearer sk_live_invalid_secret_key_12345')
        .send({ templateId: 'non-existent' })
        .expect(401);

      expect(response.body).toHaveProperty('status', 401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error.message).toContain('Invalid, inactive, or expired API Key');
    });

    it('should reject requests with malformed Bearer token format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/render')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .send({ templateId: 'non-existent' })
        .expect(401);

      expect(response.body).toHaveProperty('status', 401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/auth/me (Unauthenticated State)', () => {
    it('should reject unauthenticated requests to protected auth endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('status', 401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });
});
