export enum QueueStatus {
  ACTIVE = 'ACTIVE',
  PENDING_INITIALIZATION = 'PENDING_INITIALIZATION',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

export enum ScheduledEmailStatus {
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface EmailQueueDto {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  concurrency: number;
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    schedulers?: number;
    scheduledEmails?: number;
  };
}

export interface CreateEmailQueueDto {
  name: string;
  description?: string;
  concurrency?: number;
}

export type SchedulerSourceType = 'TEMPLATE' | 'ENTRY';

export interface EmailSchedulerDto {
  id: string;
  orgId: string;
  queueId: string;
  templateId: string;
  contentTypeId?: string | null;
  sourceType: SchedulerSourceType;
  entryId?: string | null;
  name: string;
  description?: string | null;
  defaultTo?: string | null;
  defaultCc?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    name: string;
    type: string;
  };
  contentType?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  entry?: {
    id: string;
    status: string;
    data: any;
    publishedData?: any;
  } | null;
  queue?: {
    id: string;
    name: string;
    concurrency: number;
    status: QueueStatus;
  };
}

export interface CreateEmailSchedulerDto {
  name: string;
  description?: string;
  templateId: string;
  contentTypeId: string;
  sourceType?: SchedulerSourceType;
  entryId?: string;
  queueId: string;
  defaultTo?: string;
  defaultCc?: string;
  isActive?: boolean;
}

export interface UpdateEmailSchedulerDto {
  name?: string;
  description?: string;
  templateId?: string;
  contentTypeId?: string | null;
  sourceType?: SchedulerSourceType;
  entryId?: string | null;
  queueId?: string;
  defaultTo?: string;
  defaultCc?: string;
  isActive?: boolean;
}

export interface DispatchEmailDto {
  to?: string; // Optional: defaults to .env user if omitted
  cc?: string;
  bcc?: string;
  scheduledFor?: string | Date; // ISO date string or Date; if omitted or past, sends immediately
  queueId?: string; // Optional override; defaults to scheduler's queue
  data?: Record<string, any>; // Dynamic template payload
}

export interface ScheduledEmailDto {
  id: string;
  orgId: string;
  schedulerId: string;
  queueId: string;
  bullJobId?: string | null;
  to: string;
  cc?: string | null;
  bcc?: string | null;
  subject?: string | null;
  data: Record<string, any>;
  status: ScheduledEmailStatus;
  scheduledFor: string;
  processedAt?: string | null;
  attempts: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  scheduler?: {
    id: string;
    name: string;
    template?: {
      id: string;
      name: string;
    };
  };
  queue?: {
    id: string;
    name: string;
  };
}

export interface ReinitializeQueuesResponseDto {
  message: string;
  activeQueues: string[];
  totalInitialized: number;
}
