/**
 * Template & Rendering contracts.
 */

export type TemplateType = 'CUSTOM' | 'EMAIL' | 'HTML_PAGE' | 'JSON';
export type TemplateStatus = 'DRAFT' | 'PUBLISHED';

export interface TemplateDto {
  id: string;
  orgId: string;
  contentTypeId?: string | null;
  name: string;
  type: TemplateType;
  fieldsDraft?: Record<string, any> | null;
  fieldsPublished?: Record<string, any> | null;
  bodyDraft: string;
  bodyPublished?: string | null;
  subjectDraft?: string | null;
  subjectPublished?: string | null;
  status: TemplateStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contentType?: {
    id: string;
    name: string;
    slug: string;
    schema?: any;
  } | null;
}

export interface CreateTemplateInput {
  name: string;
  type?: TemplateType;
  contentTypeId?: string | null;
  fieldsDraft?: Record<string, any>;
  bodyDraft?: string;
  subjectDraft?: string | null;
  publish?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  type?: TemplateType;
  contentTypeId?: string | null;
  fieldsDraft?: Record<string, any>;
  bodyDraft?: string;
  subjectDraft?: string | null;
}

export interface PreviewTemplateInput {
  fieldsDraft?: Record<string, any>;
  fields?: Record<string, any>;
  body?: string;
  subject?: string;
  type?: TemplateType;
  variables?: Record<string, any>;
  contentId?: string;
}

export interface TemplateListResponse {
  items: TemplateDto[];
  total: number;
  page: number;
  limit: number;
}


/**
 * Request payload for content generation and template rendering.
 * schemaId (UUID) is used instead of apiIdentifier/slug to guarantee collision-free resolution.
 */
export interface GenerationRequestDto {
  schemaId: string;
  templateId?: string;
  contentId?: string;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

export interface RenderRequestDto {
  schemaId?: string;
  templateId?: string;
  contentId?: string;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

export interface RenderEmailResponse {
  type: 'EMAIL';
  subject: string;
  body: string;
  data?: Record<string, any>;
  output?: Record<string, any>;
}

export interface RenderHtmlResponse {
  type: 'HTML_PAGE';
  html: string;
  data?: Record<string, any>;
  output?: Record<string, any>;
}

export interface RenderJsonResponse {
  type: 'JSON';
  payload: Record<string, any>;
  data?: Record<string, any>;
  output?: Record<string, any>;
}

export interface RenderModelResponse {
  type?: TemplateType;
  data: Record<string, any>; // User-defined output fields according to the Model! (e.g. { sub: '...', body: '...' })
  output?: Record<string, any>;
  model?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  template?: {
    id: string;
    name: string;
  } | null;
  subject?: string;
  body?: string;
  html?: string;
  payload?: Record<string, any>;
}

export type RenderOutputData =
  | RenderModelResponse
  | RenderEmailResponse
  | RenderHtmlResponse
  | RenderJsonResponse;
