/**
 * Template & Rendering contracts.
 */

export type TemplateType = 'EMAIL' | 'HTML_PAGE' | 'JSON';
export type TemplateStatus = 'DRAFT' | 'PUBLISHED';

export interface TemplateDto {
  id: string;
  orgId: string;
  contentTypeId?: string | null;
  name: string;
  type: TemplateType;
  bodyDraft: string;
  bodyPublished?: string | null;
  subjectDraft?: string | null;
  subjectPublished?: string | null;
  status: TemplateStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
}

export interface RenderHtmlResponse {
  type: 'HTML_PAGE';
  html: string;
}

export interface RenderJsonResponse {
  type: 'JSON';
  payload: Record<string, any>;
}

export type RenderOutputData = RenderEmailResponse | RenderHtmlResponse | RenderJsonResponse;
