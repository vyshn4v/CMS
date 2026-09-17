import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldValidationDto {
  @ApiPropertyOptional({ example: 1 }) minLength?: number;
  @ApiPropertyOptional({ example: 255 }) maxLength?: number;
  @ApiPropertyOptional({ example: 0 }) min?: number;
  @ApiPropertyOptional({ example: 1000 }) max?: number;
  @ApiPropertyOptional({ example: '^[a-z]+$' }) pattern?: string;
  @ApiPropertyOptional({ example: 'Must be lowercase letters only' }) regexErrorMessage?: string;
}

export class RelationConfigDto {
  @ApiProperty({ example: 'one-to-many', enum: ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'] })
  type: string;
  @ApiProperty({ example: 'uuid-here' }) targetContentTypeId: string;
  @ApiProperty({ example: 'articles' }) targetContentTypeSlug: string;
  @ApiProperty({ example: 'title' }) displayField: string;
}

export class ComponentConfigDto {
  @ApiProperty({ example: 'component-uuid' }) componentId: string;
  @ApiProperty({ example: 'seo-metadata' }) componentSlug: string;
  @ApiPropertyOptional({ example: false }) repeatable?: boolean;
}

export class DynamicZoneConfigDto {
  @ApiProperty({ type: [String], example: ['comp-id-1', 'comp-id-2'] })
  allowedComponentIds: string[];
}

export class FieldDefinitionDto {
  @ApiProperty({ example: 'title', description: 'Field API name' }) name: string;
  @ApiProperty({ example: 'text', enum: ['text', 'richtext', 'number', 'boolean', 'date', 'datetime', 'json', 'email', 'enum', 'media', 'relation', 'component', 'dynamiczone'] })
  type: string;
  @ApiProperty({ example: 'Title', description: 'Human-readable label' }) label: string;
  @ApiPropertyOptional({ example: true }) required?: boolean;
  @ApiPropertyOptional({ example: false }) unique?: boolean;
  @ApiPropertyOptional({ description: 'Default value for the field' }) defaultValue?: any;
  @ApiPropertyOptional({ type: [String], example: ['option1', 'option2'], description: 'Enum options' }) options?: string[];
  @ApiPropertyOptional({ type: () => FieldValidationDto }) validations?: FieldValidationDto;
  @ApiPropertyOptional({ type: () => RelationConfigDto }) relation?: RelationConfigDto;
  @ApiPropertyOptional({ type: () => ComponentConfigDto }) component?: ComponentConfigDto;
  @ApiPropertyOptional({ type: () => DynamicZoneConfigDto }) dynamiczone?: DynamicZoneConfigDto;
}

export class SchemaDefinitionDto {
  @ApiProperty({ type: [FieldDefinitionDto], description: 'Array of field definitions' })
  fields: FieldDefinitionDto[];

  @ApiPropertyOptional({ example: 'EMAIL', enum: ['EMAIL', 'PUSH_NOTIFICATION', 'SMS', 'HTML_PAGE', 'CUSTOM'] })
  modelType?: string;
}

export class CreateContentTypeDto {
  @ApiProperty({ example: 'Blog Article', description: 'Content type name' }) name: string;
  @ApiPropertyOptional({ example: 'blog-articles', description: 'URL slug (auto-generated if omitted)' }) slug?: string;
  @ApiPropertyOptional({ example: 'Blog articles for the main site' }) description?: string;
  @ApiPropertyOptional({ example: 'COLLECTION', enum: ['COLLECTION', 'SINGLE'], default: 'COLLECTION' }) kind?: string;
  @ApiProperty({ type: () => SchemaDefinitionDto, description: 'Schema with field definitions' }) schema: SchemaDefinitionDto;
}

export class UpdateContentTypeDto {
  @ApiPropertyOptional({ example: 'Updated Name' }) name?: string;
  @ApiPropertyOptional({ example: 'Updated description' }) description?: string;
  @ApiPropertyOptional({ example: 'COLLECTION', enum: ['COLLECTION', 'SINGLE'] }) kind?: string;
  @ApiPropertyOptional({ type: () => SchemaDefinitionDto }) schema?: SchemaDefinitionDto;
}

export class CreateComponentDto {
  @ApiProperty({ example: 'SEO Metadata' }) name: string;
  @ApiPropertyOptional({ example: 'seo-metadata' }) slug?: string;
  @ApiPropertyOptional({ example: 'default', description: 'Component category' }) category?: string;
  @ApiProperty({ type: () => SchemaDefinitionDto }) schema: SchemaDefinitionDto;
}

export class UpdateComponentDto {
  @ApiPropertyOptional({ example: 'Updated Component Name' }) name?: string;
  @ApiPropertyOptional({ example: 'seo' }) category?: string;
  @ApiPropertyOptional({ type: () => SchemaDefinitionDto }) schema?: SchemaDefinitionDto;
}
