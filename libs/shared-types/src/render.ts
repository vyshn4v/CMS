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

export interface ModelRenderData {
  type?: string;
  data: Record<string, any>; // User-defined output fields matching the Model
  output: Record<string, any>;
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
  payload?: any;
}

export interface EmailRenderData {
  type: 'EMAIL';
  subject: string;
  body: string;
  data?: Record<string, any>;
  output?: Record<string, any>;
  model?: any;
  template?: any;
}

export interface HtmlPageRenderData {
  type: 'HTML_PAGE';
  html: string;
  data?: Record<string, any>;
  output?: Record<string, any>;
  model?: any;
  template?: any;
}

export interface JsonRenderData {
  type: 'JSON';
  payload: any;
  data?: Record<string, any>;
  output?: Record<string, any>;
  model?: any;
  template?: any;
}

export type RenderData = ModelRenderData | EmailRenderData | HtmlPageRenderData | JsonRenderData;
