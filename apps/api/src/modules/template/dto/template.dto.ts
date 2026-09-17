import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Invoice Email', description: 'Template name' })
  name: string;

  @ApiPropertyOptional({ example: 'EMAIL', enum: ['CUSTOM', 'EMAIL', 'HTML_PAGE', 'JSON'], description: 'Template output type' })
  type?: string;

  @ApiPropertyOptional({ example: 'content-type-uuid', description: 'Target content type ID', nullable: true })
  contentTypeId?: string | null;

  @ApiPropertyOptional({ description: 'Template field mappings (key-value)', example: { subject: '{{title}}', body: '{{content}}' } })
  fieldsDraft?: Record<string, any>;

  @ApiPropertyOptional({ example: '<h1>{{title}}</h1><p>{{body}}</p>', description: 'Handlebars template body' })
  bodyDraft?: string;

  @ApiPropertyOptional({ example: 'Invoice for {{customerName}}', description: 'Email subject template', nullable: true })
  subjectDraft?: string | null;

  @ApiPropertyOptional({ example: false, description: 'Publish immediately after creation' })
  publish?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Updated Template Name' })
  name?: string;

  @ApiPropertyOptional({ example: 'EMAIL', enum: ['CUSTOM', 'EMAIL', 'HTML_PAGE', 'JSON'] })
  type?: string;

  @ApiPropertyOptional({ example: 'content-type-uuid', nullable: true })
  contentTypeId?: string | null;

  @ApiPropertyOptional({ description: 'Updated field mappings' })
  fieldsDraft?: Record<string, any>;

  @ApiPropertyOptional({ example: '<h1>{{title}}</h1>' })
  bodyDraft?: string;

  @ApiPropertyOptional({ example: 'Updated Subject', nullable: true })
  subjectDraft?: string | null;
}

export class PreviewTemplateDto {
  @ApiPropertyOptional({ description: 'Field draft mappings for preview' })
  fieldsDraft?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Published field mappings' })
  fields?: Record<string, any>;

  @ApiPropertyOptional({ example: '<h1>{{title}}</h1>', description: 'Template body to preview' })
  body?: string;

  @ApiPropertyOptional({ example: 'Subject: {{title}}', description: 'Subject to preview' })
  subject?: string;

  @ApiPropertyOptional({ example: 'EMAIL', enum: ['CUSTOM', 'EMAIL', 'HTML_PAGE', 'JSON'] })
  type?: string;

  @ApiPropertyOptional({ description: 'Handlebars context variables', example: { siteName: 'My Site' } })
  variables?: Record<string, any>;

  @ApiPropertyOptional({ example: 'content-entry-uuid', description: 'Content entry ID to use as data source' })
  contentId?: string;
}

export class PublishTemplateDto {
  @ApiPropertyOptional({ example: '<h1>{{title}}</h1>', description: 'Body draft to publish' })
  bodyDraft?: string;

  @ApiPropertyOptional({ example: 'Invoice for {{name}}', description: 'Subject draft to publish' })
  subjectDraft?: string;

  @ApiPropertyOptional({ example: 'Final Template Name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Field mappings draft to publish' })
  fieldsDraft?: Record<string, string>;
}
