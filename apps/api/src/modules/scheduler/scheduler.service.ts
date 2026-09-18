import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueManagerService } from '../queue/queue-manager.service';
import { CreateSchedulerDto } from './dto/create-scheduler.dto';
import { UpdateSchedulerDto } from './dto/update-scheduler.dto';
import { DispatchEmailDto } from './dto/dispatch-email.dto';
import { ScheduledEmailStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueManagerService: QueueManagerService,
  ) {}

  // ============================================================================
  // Schedulers Configuration CRUD
  // ============================================================================

  async listSchedulers(orgId: string, page = 1, limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    const [schedulers, total] = await Promise.all([
      this.prisma.emailScheduler.findMany({
        where: { orgId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: { id: true, name: true, type: true },
          },
          contentType: {
            select: { id: true, name: true, slug: true },
          },
          queue: {
            select: { id: true, name: true, concurrency: true, status: true },
          },
        },
      }),
      this.prisma.emailScheduler.count({ where: { orgId } }),
    ]);

    return {
      data: schedulers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getScheduler(orgId: string, id: string) {
    const scheduler = await this.prisma.emailScheduler.findFirst({
      where: { id, orgId },
      include: {
        template: true,
        contentType: true,
        queue: true,
      },
    });

    if (!scheduler) {
      throw new NotFoundException(`Scheduler ${id} not found`);
    }

    return scheduler;
  }

  async createScheduler(orgId: string, dto: CreateSchedulerDto) {
    // Validate template exists and belongs to org
    const template = await this.prisma.template.findFirst({
      where: { id: dto.templateId, orgId },
    });
    if (!template) {
      throw new NotFoundException(`Template ${dto.templateId} not found in this organization`);
    }

    // Validate queue exists and belongs to org
    const queue = await this.prisma.emailQueue.findFirst({
      where: { id: dto.queueId, orgId },
    });
    if (!queue) {
      throw new NotFoundException(`Queue ${dto.queueId} not found in this organization`);
    }

    // Optional content model check
    if (dto.contentTypeId) {
      const model = await this.prisma.contentType.findFirst({
        where: { id: dto.contentTypeId, orgId },
      });
      if (!model) {
        throw new NotFoundException(`Model ${dto.contentTypeId} not found in this organization`);
      }
    }

    return this.prisma.emailScheduler.create({
      data: {
        orgId,
        name: dto.name,
        description: dto.description,
        templateId: dto.templateId,
        contentTypeId: dto.contentTypeId || null,
        queueId: dto.queueId,
        defaultTo: dto.defaultTo,
        defaultCc: dto.defaultCc,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        template: { select: { id: true, name: true, type: true } },
        contentType: { select: { id: true, name: true, slug: true } },
        queue: { select: { id: true, name: true } },
      },
    });
  }

  async updateScheduler(orgId: string, id: string, dto: UpdateSchedulerDto) {
    await this.getScheduler(orgId, id);

    if (dto.templateId) {
      const template = await this.prisma.template.findFirst({
        where: { id: dto.templateId, orgId },
      });
      if (!template) throw new NotFoundException(`Template ${dto.templateId} not found`);
    }

    if (dto.queueId) {
      const queue = await this.prisma.emailQueue.findFirst({
        where: { id: dto.queueId, orgId },
      });
      if (!queue) throw new NotFoundException(`Queue ${dto.queueId} not found`);
    }

    return this.prisma.emailScheduler.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.templateId !== undefined && { templateId: dto.templateId }),
        ...(dto.contentTypeId !== undefined && { contentTypeId: dto.contentTypeId }),
        ...(dto.queueId !== undefined && { queueId: dto.queueId }),
        ...(dto.defaultTo !== undefined && { defaultTo: dto.defaultTo }),
        ...(dto.defaultCc !== undefined && { defaultCc: dto.defaultCc }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteScheduler(orgId: string, id: string) {
    await this.getScheduler(orgId, id);
    return this.prisma.emailScheduler.delete({
      where: { id },
    });
  }

  // ============================================================================
  // Email Dispatch Execution
  // ============================================================================

  async dispatchEmail(orgId: string, schedulerId: string, dto: DispatchEmailDto) {
    const scheduler = await this.prisma.emailScheduler.findFirst({
      where: { id: schedulerId, orgId },
    });

    if (!scheduler) {
      throw new NotFoundException(`Email scheduler ${schedulerId} not found in this organization`);
    }

    if (!scheduler.isActive) {
      throw new BadRequestException(`Email scheduler "${scheduler.name}" is currently deactivated`);
    }

    const recipientTo = dto.to || scheduler.defaultTo;
    if (!recipientTo) {
      throw new BadRequestException('Recipient "to" email address is required');
    }

    const recipientCc = dto.cc || scheduler.defaultCc || null;
    const targetQueueId = dto.queueId || scheduler.queueId;

    // Calculate delay
    const now = new Date();
    const scheduledTime = dto.scheduledFor ? new Date(dto.scheduledFor) : now;
    const delayMs = Math.max(0, scheduledTime.getTime() - now.getTime());

    // Persist ScheduledEmail record
    const scheduledEmail = await this.prisma.scheduledEmail.create({
      data: {
        orgId,
        schedulerId: scheduler.id,
        queueId: targetQueueId,
        to: recipientTo,
        cc: recipientCc,
        bcc: dto.bcc || null,
        data: dto.data || {},
        status: ScheduledEmailStatus.SCHEDULED,
        scheduledFor: scheduledTime,
      },
    });

    // Enqueue BullMQ delayed or immediate job
    const job = await this.queueManagerService.addScheduledEmailJob(
      targetQueueId,
      scheduledEmail.id,
      delayMs,
    );

    // Save bullJobId back
    await this.prisma.scheduledEmail.update({
      where: { id: scheduledEmail.id },
      data: { bullJobId: job.id ? String(job.id) : scheduledEmail.id },
    });

    return {
      scheduledEmailId: scheduledEmail.id,
      status: ScheduledEmailStatus.SCHEDULED,
      to: recipientTo,
      scheduledFor: scheduledTime.toISOString(),
      delayMs,
    };
  }

  // ============================================================================
  // Scheduled Emails Monitoring & Management
  // ============================================================================

  async listScheduledEmails(
    orgId: string,
    query: {
      page?: number;
      limit?: number;
      status?: ScheduledEmailStatus;
      schedulerId?: string;
      search?: string;
    },
  ) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = { orgId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.schedulerId) {
      where.schedulerId = query.schedulerId;
    }
    if (query.search) {
      where.OR = [
        { to: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      this.prisma.scheduledEmail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          scheduler: {
            select: {
              id: true,
              name: true,
              template: { select: { id: true, name: true } },
            },
          },
          queue: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.scheduledEmail.count({ where }),
    ]);

    return {
      data: emails,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getScheduledEmail(orgId: string, id: string) {
    const email = await this.prisma.scheduledEmail.findFirst({
      where: { id, orgId },
      include: {
        scheduler: {
          include: {
            template: true,
          },
        },
        queue: true,
      },
    });

    if (!email) {
      throw new NotFoundException(`Scheduled email ${id} not found`);
    }

    return email;
  }

  async cancelScheduledEmail(orgId: string, id: string) {
    const email = await this.getScheduledEmail(orgId, id);

    if (email.status !== ScheduledEmailStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot cancel email with status "${email.status}". Only SCHEDULED emails can be cancelled.`,
      );
    }

    // Cancel from BullMQ
    if (email.bullJobId) {
      await this.queueManagerService.cancelJob(email.queueId, email.bullJobId);
    }

    return this.prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: ScheduledEmailStatus.CANCELLED,
      },
    });
  }

  async retryScheduledEmail(orgId: string, id: string) {
    const email = await this.getScheduledEmail(orgId, id);

    if (email.status !== ScheduledEmailStatus.FAILED) {
      throw new BadRequestException(
        `Cannot retry email with status "${email.status}". Only FAILED emails can be retried.`,
      );
    }

    // Reset status and queue immediately
    const updated = await this.prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: ScheduledEmailStatus.SCHEDULED,
        attempts: 0,
        errorMessage: null,
      },
    });

    const job = await this.queueManagerService.addScheduledEmailJob(
      email.queueId,
      email.id,
      0, // immediate
    );

    if (job.id) {
      await this.prisma.scheduledEmail.update({
        where: { id },
        data: { bullJobId: String(job.id) },
      });
    }

    return updated;
  }
}
