import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrgModule } from './modules/org/org.module';
import { RoleModule } from './modules/role/role.module';

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
  ],
})
export class AppModule {}
