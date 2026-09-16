/**
 * Contracts and types for Public Render API.
 */

export interface RenderRequest {
  schemaId?: string; // Target ContentType UUID
  templateId?: string; // Target Template UUID
  contentId?: string; // Published ContentEntry UUID
  data?: Record<string, any>; // Direct data payload matching schema
  variables?: Record<string, any>; // Additional Handlebars context variables
}

export interface EmailRenderData {
  type: 'EMAIL';
  subject: string;
  body: string;
}

export interface HtmlPageRenderData {
  type: 'HTML_PAGE';
  html: string;
}

export interface JsonRenderData {
  type: 'JSON';
  payload: any;
}

export type RenderData = EmailRenderData | HtmlPageRenderData | JsonRenderData;
