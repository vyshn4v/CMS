import { ApiPropertyOptional } from '@nestjs/swagger';

export class RenderRequestDto {
  @ApiPropertyOptional({ example: 'schema-uuid', description: 'Target ContentType UUID' })
  schemaId?: string;

  @ApiPropertyOptional({ example: 'template-uuid', description: 'Target Template UUID' })
  templateId?: string;

  @ApiPropertyOptional({ example: 'content-entry-uuid', description: 'Published ContentEntry UUID' })
  contentId?: string;

  @ApiPropertyOptional({ description: 'Direct data payload matching schema', example: { customerName: 'Alice', amount: 499.00 } })
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional Handlebars context variables', example: { siteName: 'My CMS' } })
  variables?: Record<string, any>;
}
