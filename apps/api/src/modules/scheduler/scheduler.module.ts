import { Module } from '@nestjs/common';
import {
  SchedulerController,
  ScheduledEmailController,
  PublicSchedulerDispatchController,
} from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { EmailSenderService } from './email-sender.service';
import { QueueModule } from '../queue/queue.module';
import { ApiKeyModule } from '../api-key/api-key.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [QueueModule, ApiKeyModule, RedisModule],
  controllers: [
    SchedulerController,
    ScheduledEmailController,
    PublicSchedulerDispatchController,
  ],
  providers: [SchedulerService, EmailSenderService],
  exports: [SchedulerService, EmailSenderService],
})
export class SchedulerModule {}
