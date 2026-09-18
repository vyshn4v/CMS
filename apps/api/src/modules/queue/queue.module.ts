import { Module, forwardRef } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueManagerService } from './queue-manager.service';
import { EmailWorkerProcessor } from './email-worker.processor';
import { TemplateModule } from '../template/template.module';
import { RedisModule } from '../redis/redis.module';
import { EmailSenderService } from '../scheduler/email-sender.service';

@Module({
  imports: [TemplateModule, RedisModule],
  controllers: [QueueController],
  providers: [
    QueueService,
    QueueManagerService,
    EmailWorkerProcessor,
    EmailSenderService,
  ],
  exports: [QueueManagerService, QueueService, EmailSenderService],
})
export class QueueModule {}
