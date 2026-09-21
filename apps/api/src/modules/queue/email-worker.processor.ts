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
      const rawData = (scheduledEmail.data as Record<string, any>) || {};
      const context: Record<string, any> = {
        ...rawData,
        data: rawData,
      };

      let renderedSubject = scheduledEmail.subject || template?.name || 'Predefined Email';
      let renderedHtml = '';

      if (template) {
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
      } else {
        // Direct Predefined Entry Rendering (No Template Required)
        renderedSubject =
          rawData.subject ||
          rawData.title ||
          rawData.name ||
          scheduledEmail.scheduler?.name ||
          'Predefined Notification';

        renderedHtml = rawData.html || rawData.body || rawData.content || rawData.message;
        if (!renderedHtml) {
          renderedHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1e293b; margin-top: 0;">${renderedSubject}</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                ${Object.entries(rawData)
                  .filter(([k]) => !['id', 'orgId', 'contentTypeId', 'createdAt', 'updatedAt'].includes(k))
                  .map(
                    ([k, v]) => `
                    <tr>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; width: 35%;">${k}:</td>
                      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
                    </tr>
                  `,
                  )
                  .join('')}
              </table>
            </div>
          `;
        }
      }

      // 3. SMTP Delivery
      await this.emailSenderService.sendEmail({
        from: scheduledEmail.from || undefined,
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
