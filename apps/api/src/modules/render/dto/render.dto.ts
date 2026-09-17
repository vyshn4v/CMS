import { ApiPropertyOptional } from '@nestjs/swagger';

export class RenderRequestDto {
  @ApiPropertyOptional({ example: 'schema-uuid', description: 'Target ContentType UUID (Model). Automatically uses the latest published template for this model if templateId is omitted.' })
  schemaId?: string;

  @ApiPropertyOptional({ example: 'template-uuid', description: 'Specific Template UUID (Optional. If omitted, resolved automatically from schemaId or contentId).' })
  templateId?: string;

  @ApiPropertyOptional({ example: 'content-entry-uuid', description: 'Published ContentEntry UUID (Optional. Can be used alone or combined with templateId/schemaId).' })
  contentId?: string;

  @ApiPropertyOptional({ description: 'Direct data payload matching schema', example: { customerName: 'Alice', amount: 499.00 } })
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional Handlebars context variables', example: { siteName: 'My CMS' } })
  variables?: Record<string, any>;
}
