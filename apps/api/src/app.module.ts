import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
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

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
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
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
