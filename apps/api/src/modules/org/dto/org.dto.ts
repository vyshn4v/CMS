import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc', description: 'Organization name' })
  name: string;

  @ApiPropertyOptional({ example: 'acme-inc', description: 'URL-safe slug (auto-generated if omitted)' })
  slug?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Logo URL' })
  logoUrl?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Updated organization name' })
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-logo.png' })
  logoUrl?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email of the user to invite' })
  email: string;

  @ApiProperty({ example: 'role-uuid-here', description: 'Role ID to assign' })
  roleId: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'role-uuid-here', description: 'New role ID' })
  roleId: string;
}
