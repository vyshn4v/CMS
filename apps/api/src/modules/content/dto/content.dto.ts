import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEntryDto {
  @ApiProperty({ description: 'Content data matching the schema fields', example: { title: 'My Article', body: 'Content here...' } })
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Publish immediately after creation', example: false, default: false })
  publish?: boolean;
}

export class UpdateEntryDto {
  @ApiProperty({ description: 'Updated content data', example: { title: 'Updated Title' } })
  data: Record<string, any>;
}

export class PublishEntryDto {
  @ApiPropertyOptional({ description: 'Optional data overrides for publishing', example: { title: 'Final Title' } })
  data?: Record<string, any>;
}

export class ContentQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 }) page?: number;
  @ApiPropertyOptional({ example: 20, description: 'Items per page', default: 20 }) limit?: number;
  @ApiPropertyOptional({ example: 'createdAt', description: 'Sort field' }) sort?: string;
  @ApiPropertyOptional({ example: 'DRAFT', enum: ['DRAFT', 'PUBLISHED'], description: 'Filter by status' }) status?: string;
  @ApiPropertyOptional({ example: 'search term', description: 'Keyword search' }) search?: string;
}
