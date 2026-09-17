import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * Bootstrap the NestJS API application.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 5000);
  const clientUrl = configService.get<string>('CLIENT_URL', 'http://localhost:5173');

  // Security and parser middlewares
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  const cookieMiddleware = (cookieParser as any).default || cookieParser;
  app.use(cookieMiddleware());

  // CORS configuration
  app.enableCors({
    origin: clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id'],
  });

  // Global routing prefix & envelopes
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const options = new DocumentBuilder()
    .setTitle('CMS Headless API')
    .setDescription('REST API documentation for the CMS Headless content management system')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'Authorization' }, 'api-key')
    .addTag('Auth')
    .addTag('Organizations')
    .addTag('Schemas')
    .addTag('Components')
    .addTag('Content')
    .addTag('Templates')
    .addTag('Render')
    .addTag('API Keys')
    .addTag('Roles')
    .addTag('Audit')
    .build();
  
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`CMS Backend API is running at: http://localhost:${port}/api/v1`);
}

bootstrap();
