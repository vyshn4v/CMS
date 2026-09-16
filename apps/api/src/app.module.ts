import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrgModule } from './modules/org/org.module';
import { RoleModule } from './modules/role/role.module';
import { SchemaModule } from './modules/schema/schema.module';
import { ContentModule } from './modules/content/content.module';
import { TemplateModule } from './modules/template/template.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { RenderModule } from './modules/render/render.module';

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
    AuthModule,
    OrgModule,
    RoleModule,
    SchemaModule,
    ContentModule,
    TemplateModule,
    ApiKeyModule,
    RenderModule,
  ],
})
export class AppModule {}
