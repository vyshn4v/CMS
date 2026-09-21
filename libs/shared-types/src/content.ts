/**
 * Content Entry contracts.
 */

export type ContentEntryStatus = 'DRAFT' | 'PUBLISHED';

export interface ContentEntryDto {
  id: string;
  contentTypeId: string;
  orgId: string;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  status: ContentEntryStatus;
  data: Record<string, any>;
  publishedData?: Record<string, any> | null;
  publishedAt?: string | null;
  _populated?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryInput {
  data: Record<string, any>;
  publish?: boolean;
}

export interface UpdateEntryInput {
  data: Record<string, any>;
}

export interface PublishEntryInput {
  data?: Record<string, any>;
}

export interface ContentEntryListResponse {
  items: ContentEntryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContentQueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  status?: ContentEntryStatus;
  search?: string;
}
