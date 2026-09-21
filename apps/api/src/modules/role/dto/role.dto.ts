import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Content Manager', description: 'Role name' })
  name: string;

  @ApiPropertyOptional({ example: 'Can manage all content but not schemas', description: 'Role description' })
  description?: string;

  @ApiProperty({ type: [String], example: ['content.create', 'content.read', 'content.update', 'content.publish'], description: 'Permission identifiers' })
  permissions: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior Editor' })
  name?: string;

  @ApiPropertyOptional({ example: 'Updated role description' })
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['content.create', 'content.read'] })
  permissions?: string[];
}
