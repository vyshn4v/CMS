import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { HandlebarsService } from '../template/handlebars.service';
import { TemplateEngineService } from '../template/template-engine.service';
import { EmailSenderService } from '../scheduler/email-sender.service';

export interface EmailJobData {
  scheduledEmailId: string;
}

@Injectable()
export class EmailWorkerProcessor {
  private readonly logger = new Logger(EmailWorkerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly handlebarsService: HandlebarsService,
    private readonly templateEngineService: TemplateEngineService,
    private readonly emailSenderService: EmailSenderService,
  ) {}

  /**
   * Processes an incoming BullMQ job to render template data and dispatch email via SMTP.
   */
  async processJob(job: Job<EmailJobData>): Promise<void> {
    const { scheduledEmailId } = job.data;
    this.logger.log(`Processing email job ${job.id} for ScheduledEmail: ${scheduledEmailId} (Attempt: ${job.attemptsMade + 1})`);

    const scheduledEmail = await this.prisma.scheduledEmail.findUnique({
      where: { id: scheduledEmailId },
      include: {
        scheduler: {
          include: {
            template: {
              include: {
                contentType: true,
              },
            },
            contentType: true,
          },
        },
        queue: true,
      },
    });

    if (!scheduledEmail) {
      this.logger.warn(`ScheduledEmail record ${scheduledEmailId} not found in database. Aborting job.`);
      return;
    }

    if (scheduledEmail.status === 'CANCELLED') {
      this.logger.log(`ScheduledEmail ${scheduledEmailId} was cancelled by user. Skipping delivery.`);
      return;
    }

    // Update status to PROCESSING and increment attempts
    await this.prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
      },
    });

    try {
      const template = scheduledEmail.scheduler?.template;
      if (!template) {
        throw new Error(`Associated template not found for scheduler "${scheduledEmail.scheduler?.name}"`);
      }

      const rawData = (scheduledEmail.data as Record<string, any>) || {};
      const context: Record<string, any> = {
        ...rawData,
        data: rawData,
      };

      let renderedSubject = scheduledEmail.subject || template.name;
      let renderedHtml = '';

      // 1. Model-driven Multi-Field Rendering
      const fieldsPublished = template.fieldsPublished as Record<string, any> | null;
      if (fieldsPublished && Object.keys(fieldsPublished).length > 0) {
        const renderedFields = this.templateEngineService.renderModelFields({
          fields: fieldsPublished,
          context,
          modelFields: (template.contentType?.schema as any)?.fields || [],
          fallbackDrafts: template.fieldsDraft as any,
        });

        if (renderedFields.subject) {
          renderedSubject = String(renderedFields.subject);
        }
        renderedHtml =
          renderedFields.body ||
          renderedFields.html ||
          renderedFields.message ||
          JSON.stringify(renderedFields, null, 2);
      } else {
        // 2. Standard Single Body Render
        const templateSource = template.bodyPublished || template.bodyDraft || '';
        renderedHtml = this.handlebarsService.render(templateSource, context);

        if (template.subjectPublished) {
          renderedSubject = this.handlebarsService.render(template.subjectPublished, context);
        } else if (template.subjectDraft) {
          renderedSubject = this.handlebarsService.render(template.subjectDraft, context);
        }
      }

      // 3. SMTP Delivery
      await this.emailSenderService.sendEmail({
        to: scheduledEmail.to,
        cc: scheduledEmail.cc,
        bcc: scheduledEmail.bcc,
        subject: renderedSubject,
        html: renderedHtml,
      });

      // 4. Mark as COMPLETED
      await this.prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: {
          status: 'COMPLETED',
          subject: renderedSubject,
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      this.logger.log(`ScheduledEmail ${scheduledEmailId} successfully delivered and marked COMPLETED.`);
    } catch (err: any) {
      this.logger.error(`Delivery failed for ScheduledEmail ${scheduledEmailId}: ${err.message}`);

      const maxAttempts = job.opts.attempts || 3;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      await this.prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: {
          status: isFinalAttempt ? 'FAILED' : 'PROCESSING',
          errorMessage: err.message,
        },
      });

      throw err; // Re-throw to allow BullMQ retry logic to fire
    }
  }
}
