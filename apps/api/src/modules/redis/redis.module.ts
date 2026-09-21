import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global module providing high-performance Redis caching across all domain modules.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
