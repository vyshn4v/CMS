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

export interface RenderRequestDto {
  templateId: string;
  contentId?: string;
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
