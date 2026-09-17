import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Mobile App Delivery Key', description: 'Human-readable key name' })
  name: string;

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z', description: 'Key expiration date (ISO 8601)', nullable: true })
  expiresAt?: string | null;
}
