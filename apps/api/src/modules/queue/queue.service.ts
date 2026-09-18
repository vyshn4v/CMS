import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueManagerService } from './queue-manager.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { QueueStatus } from '@prisma/client';

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueManagerService: QueueManagerService,
  ) {}

  async listQueues(orgId: string) {
    const queues = await this.prisma.emailQueue.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            schedulers: true,
            scheduledEmails: true,
          },
        },
      },
    });

    return queues.map((q) => ({
      ...q,
      isRuntimeActive: this.queueManagerService.isQueueActive(q.id),
    }));
  }

  async createQueue(orgId: string, dto: CreateQueueDto) {
    const existing = await this.prisma.emailQueue.findUnique({
      where: {
        orgId_name: {
          orgId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Queue with name "${dto.name}" already exists in this organization`);
    }

    return this.prisma.emailQueue.create({
      data: {
        orgId,
        name: dto.name,
        description: dto.description,
        concurrency: dto.concurrency || 5,
        status: QueueStatus.PENDING_INITIALIZATION,
      },
    });
  }

  async deleteQueue(orgId: string, queueId: string) {
    const queue = await this.prisma.emailQueue.findFirst({
      where: { id: queueId, orgId },
      include: {
        _count: {
          select: { schedulers: true },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException(`Queue ${queueId} not found`);
    }

    if (queue._count.schedulers > 0) {
      throw new BadRequestException(
        `Cannot delete queue "${queue.name}" because it is currently assigned to ${queue._count.schedulers} scheduler(s)`,
      );
    }

    return this.prisma.emailQueue.delete({
      where: { id: queueId },
    });
  }

  async reinitialize(orgId: string) {
    return this.queueManagerService.reinitializeQueues(orgId);
  }
}
