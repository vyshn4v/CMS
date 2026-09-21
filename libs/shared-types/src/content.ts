/**
 * Content Entry contracts.
 */

export type ContentEntryStatus = 'DRAFT' | 'PUBLISHED';

export interface ContentEntryDto {
  id: string;
  contentTypeId: string;
  orgId: string;
  createdById: string;
  status: ContentEntryStatus;
  data: Record<string, any>;
  publishedData?: Record<string, any> | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryInput {
  data: Record<string, any>;
}

export interface UpdateEntryInput {
  data: Record<string, any>;
}
