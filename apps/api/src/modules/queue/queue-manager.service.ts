import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailWorkerProcessor, EmailJobData } from './email-worker.processor';
import { EmailQueue, QueueStatus } from '@prisma/client';

@Injectable()
export class QueueManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueManagerService.name);
  private readonly queues = new Map<string, Queue<EmailJobData>>();
  private readonly workers = new Map<string, Worker<EmailJobData>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailWorkerProcessor: EmailWorkerProcessor,
  ) {}

  /**
   * Generates Redis connection parameters with maxRetriesPerRequest: null required by BullMQ.
   */
  private getRedisConnectionOptions() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') ||
      process.env.REDIS_URL ||
      'redis://localhost:6379';

    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname || 'localhost',
        port: url.port ? parseInt(url.port, 10) : 6379,
        username: url.username || undefined,
        password: url.password || undefined,
        maxRetriesPerRequest: null,
      };
    } catch {
      return {
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
      };
    }
  }

  /**
   * Helper to format a distinct BullMQ queue name per EmailQueue table record.
   */
  private getBullQueueName(queueId: string): string {
    return `email-queue-${queueId}`;
  }

  async onModuleInit() {
    this.logger.log('Initializing BullMQ dynamic queue pools from database...');
    try {
      const activeQueues = await this.prisma.emailQueue.findMany({
        where: { status: QueueStatus.ACTIVE },
      });

      for (const q of activeQueues) {
        await this.startQueueAndWorker(q);
      }
      this.logger.log(`Initialized ${activeQueues.length} dynamic BullMQ queue(s).`);
    } catch (err: any) {
      this.logger.warn(`Initial queue loading failed or postponed: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Gracefully closing all dynamic BullMQ workers and queues...');
    for (const [id, worker] of this.workers.entries()) {
      try {
        await worker.close();
      } catch (e: any) {
        this.logger.warn(`Error closing worker ${id}: ${e.message}`);
      }
    }
    for (const [id, queue] of this.queues.entries()) {
      try {
        await queue.close();
      } catch (e: any) {
        this.logger.warn(`Error closing queue ${id}: ${e.message}`);
      }
    }
    this.workers.clear();
    this.queues.clear();
  }

  /**
   * Instantiates or reconfigures a BullMQ Queue and Worker for a given EmailQueue DB record.
   */
  async startQueueAndWorker(queueRecord: EmailQueue): Promise<void> {
    const queueName = this.getBullQueueName(queueRecord.id);
    const connectionOpts = this.getRedisConnectionOptions();

    // 1. Queue initialization
    let queue = this.queues.get(queueRecord.id);
    if (!queue) {
      queue = new Queue<EmailJobData>(queueName, {
        connection: connectionOpts,
      });
      this.queues.set(queueRecord.id, queue);
    }

    // 2. Worker initialization or restart
    const existingWorker = this.workers.get(queueRecord.id);
    if (existingWorker) {
      await existingWorker.close();
      this.workers.delete(queueRecord.id);
    }

    const worker = new Worker<EmailJobData>(
      queueName,
      async (job) => this.emailWorkerProcessor.processJob(job),
      {
        connection: connectionOpts,
        concurrency: queueRecord.concurrency || 5,
      },
    );

    worker.on('failed', (job, err) => {
      this.logger.warn(`Job ${job?.id} failed on queue "${queueRecord.name}": ${err.message}`);
    });

    worker.on('error', (err) => {
      this.logger.error(`Worker error on queue "${queueRecord.name}": ${err.message}`);
    });

    this.workers.set(queueRecord.id, worker);
    this.logger.log(
      `Queue "${queueRecord.name}" (${queueRecord.id}) active with concurrency ${queueRecord.concurrency}`,
    );
  }

  /**
   * Adds an email dispatch job into the target queue with optional delay.
   */
  async addScheduledEmailJob(
    queueId: string,
    scheduledEmailId: string,
    delayMs: number,
  ): Promise<Job<EmailJobData>> {
    let queue = this.queues.get(queueId);

    if (!queue) {
      const queueRecord = await this.prisma.emailQueue.findUnique({
        where: { id: queueId },
      });

      if (!queueRecord) {
        throw new NotFoundException(`Email queue ${queueId} does not exist in database`);
      }

      await this.startQueueAndWorker(queueRecord);
      queue = this.queues.get(queueId);
    }

    if (!queue) {
      throw new Error(`Failed to initialize queue instance for queueId ${queueId}`);
    }

    const job = await queue.add(
      'send-email',
      { scheduledEmailId },
      {
        jobId: scheduledEmailId,
        delay: Math.max(0, delayMs),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );

    this.logger.log(
      `Added Job ${job.id} to queue ${queueId} (Delay: ${delayMs}ms, ScheduledEmailId: ${scheduledEmailId})`,
    );

    return job;
  }

  /**
   * Cancels a pending delayed email job from BullMQ.
   */
  async cancelJob(queueId: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueId);
    if (!queue) return false;

    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Job ${jobId} removed from BullMQ queue ${queueId}`);
        return true;
      }
      return false;
    } catch (err: any) {
      this.logger.warn(`Could not remove job ${jobId} from queue ${queueId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Reinitializes all dynamic queues from the database.
   * Activates pending queues and updates their status in PostgreSQL.
   */
  async reinitializeQueues(orgId?: string): Promise<{
    activeQueues: string[];
    totalInitialized: number;
  }> {
    const whereClause = orgId ? { orgId } : {};
    const queues = await this.prisma.emailQueue.findMany({
      where: whereClause,
    });

    const activeNames: string[] = [];

    for (const q of queues) {
      await this.startQueueAndWorker(q);
      if (q.status !== QueueStatus.ACTIVE) {
        await this.prisma.emailQueue.update({
          where: { id: q.id },
          data: { status: QueueStatus.ACTIVE },
        });
      }
      activeNames.push(q.name);
    }

    this.logger.log(`Successfully reinitialized ${queues.length} queues.`);
    return {
      activeQueues: activeNames,
      totalInitialized: queues.length,
    };
  }

  /**
   * Returns whether a queue is currently registered in memory.
   */
  isQueueActive(queueId: string): boolean {
    return this.queues.has(queueId) && this.workers.has(queueId);
  }
}
