import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Items per page' })
  limit?: number;

  @ApiPropertyOptional({ example: 'CREATE', description: 'Filter by action type', enum: ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH'] })
  action?: string;

  @ApiPropertyOptional({ example: 'CONTENT_ENTRY', description: 'Filter by resource type' })
  resourceType?: string;

  @ApiPropertyOptional({ example: 'user-uuid', description: 'Filter by actor user ID' })
  userId?: string;

  @ApiPropertyOptional({ example: 'search term', description: 'Keyword search' })
  search?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Start date filter (ISO)' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'End date filter (ISO)' })
  endDate?: string;
}
