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
          entry: {
            select: { id: true, status: true, data: true, publishedData: true },
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
        entry: true,
        queue: true,
      },
    });

    if (!scheduler) {
      throw new NotFoundException(`Scheduler ${id} not found`);
    }

    return scheduler;
  }

  async createScheduler(orgId: string, dto: CreateSchedulerDto) {
    // 1. Validate queue exists and belongs to org
    const queue = await this.prisma.emailQueue.findFirst({
      where: { id: dto.queueId, orgId },
    });
    if (!queue) {
      throw new NotFoundException(`Queue ${dto.queueId} not found in this organization`);
    }

    // 2. Validate content model schema (required)
    const model = await this.prisma.contentType.findFirst({
      where: { id: dto.contentTypeId, orgId },
    });
    if (!model) {
      throw new NotFoundException(`Schema/Model ${dto.contentTypeId} not found in this organization`);
    }

    // 3. Selection-based validation: Template vs Entry
    const sourceType = dto.sourceType === 'ENTRY' ? 'ENTRY' : 'TEMPLATE';
    let templateId: string | null = null;
    let entryId: string | null = null;

    if (sourceType === 'TEMPLATE') {
      if (!dto.templateId) {
        throw new BadRequestException('Template is required when source mode is Dynamic Template');
      }
      const template = await this.prisma.template.findFirst({
        where: { id: dto.templateId, orgId },
      });
      if (!template) {
        throw new NotFoundException(`Template ${dto.templateId} not found in this organization`);
      }
      templateId = template.id;
    } else {
      // ENTRY mode: requires entry, template is not needed
      if (!dto.entryId) {
        throw new BadRequestException('Content Entry is required when source mode is Predefined Entry');
      }
      const entry = await this.prisma.contentEntry.findFirst({
        where: { id: dto.entryId, orgId, contentTypeId: dto.contentTypeId },
      });
      if (!entry) {
        throw new NotFoundException(
          `Entry ${dto.entryId} not found for model ${dto.contentTypeId} in this organization`,
        );
      }
      entryId = entry.id;
      if (dto.templateId) {
        templateId = dto.templateId;
      }
    }

    return this.prisma.emailScheduler.create({
      data: {
        orgId,
        name: dto.name,
        description: dto.description,
        templateId,
        contentTypeId: dto.contentTypeId,
        sourceType,
        entryId,
        queueId: dto.queueId,
        defaultTo: dto.defaultTo,
        defaultCc: dto.defaultCc,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        template: { select: { id: true, name: true, type: true } },
        contentType: { select: { id: true, name: true, slug: true } },
        entry: { select: { id: true, status: true, data: true, publishedData: true } },
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

    if (dto.contentTypeId) {
      const model = await this.prisma.contentType.findFirst({
        where: { id: dto.contentTypeId, orgId },
      });
      if (!model) throw new NotFoundException(`Model ${dto.contentTypeId} not found`);
    }

    if (dto.sourceType === 'ENTRY' && dto.entryId) {
      const entry = await this.prisma.contentEntry.findFirst({
        where: { id: dto.entryId, orgId },
      });
      if (!entry) throw new NotFoundException(`Entry ${dto.entryId} not found`);
    }

    return this.prisma.emailScheduler.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.templateId !== undefined && { templateId: dto.templateId }),
        ...(dto.contentTypeId !== undefined && { contentTypeId: dto.contentTypeId }),
        ...(dto.sourceType !== undefined && { sourceType: dto.sourceType }),
        ...(dto.entryId !== undefined && { entryId: dto.entryId }),
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
      include: {
        entry: true,
      },
    });

    if (!scheduler) {
      throw new NotFoundException(`Email scheduler ${schedulerId} not found in this organization`);
    }

    if (!scheduler.isActive) {
      throw new BadRequestException(`Email scheduler "${scheduler.name}" is currently deactivated`);
    }

    // Resolve system administrator recipient from environment
    const envUser =
      process.env.DEFAULT_EMAIL_RECIPIENT ||
      process.env.SMTP_USER ||
      (process.env.ALLOWED_EMAILS ? process.env.ALLOWED_EMAILS.split(',')[0].trim() : null) ||
      'admin@cms.local';

    let recipientTo: string;
    let recipientBcc: string | null = dto.bcc || null;

    if (dto.to && dto.to.trim()) {
      recipientTo = dto.to.trim();
      // If a recipient is specified, system .env user always gets an audit copy
      if (envUser && recipientTo.toLowerCase() !== envUser.toLowerCase()) {
        recipientBcc = recipientBcc ? `${recipientBcc}, ${envUser}` : envUser;
      }
    } else {
      // If there is no "to" available, default recipient is strictly the .env user
      recipientTo = scheduler.defaultTo || envUser;
    }

    const recipientCc = dto.cc || scheduler.defaultCc || null;
    const targetQueueId = dto.queueId || scheduler.queueId;

    // Resolve data payload:
    // If scheduler is bound to a predefined entry, use entry's stored data as base
    let payloadData: Record<string, any> = {};
    if (scheduler.sourceType === 'ENTRY' && scheduler.entryId) {
      const entry = scheduler.entry || (await this.prisma.contentEntry.findUnique({ where: { id: scheduler.entryId } }));
      if (entry) {
        const entryData =
          (entry.publishedData as Record<string, any>) ||
          (entry.data as Record<string, any>) ||
          {};
        payloadData = { ...entryData };
      }
    }

    // Merge with any dynamic data passed in dispatch
    if (dto.data && typeof dto.data === 'object') {
      payloadData = {
        ...payloadData,
        ...dto.data,
      };
    }

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
        bcc: recipientBcc,
        data: payloadData,
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
