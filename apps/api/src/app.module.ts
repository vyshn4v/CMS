import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as fs from 'fs';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrgModule } from './modules/org/org.module';
import { RoleModule } from './modules/role/role.module';
import { SchemaModule } from './modules/schema/schema.module';
import { ContentModule } from './modules/content/content.module';
import { TemplateModule } from './modules/template/template.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { RenderModule } from './modules/render/render.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AppController } from './app.controller';

const resolveStaticPath = (): string | null => {
  if (process.env.STATIC_PATH && fs.existsSync(process.env.STATIC_PATH)) {
    return process.env.STATIC_PATH;
  }
  const fromCwd = join(process.cwd(), 'apps', 'web', 'dist');
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }
  const fromDir = join(__dirname, '..', '..', 'web', 'dist');
  if (fs.existsSync(fromDir)) {
    return fromDir;
  }
  return null;
};

const staticPath = resolveStaticPath();

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ...(staticPath
      ? [
          ServeStaticModule.forRoot({
            rootPath: staticPath,
            exclude: ['/api/(.*)'],
          }),
        ]
      : []),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    OrgModule,
    RoleModule,
    SchemaModule,
    ContentModule,
    TemplateModule,
    ApiKeyModule,
    RenderModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
