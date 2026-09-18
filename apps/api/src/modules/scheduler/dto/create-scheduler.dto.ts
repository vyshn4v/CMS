import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchedulerDto {
  @ApiProperty({ example: 'Order Invoices', description: 'Friendly name of the email scheduler' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Dispatches invoice emails when an order is finalized' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-template-id', description: 'UUID of the Handlebars Template to render (required for TEMPLATE mode)' })
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ example: 'uuid-content-type-id', description: 'UUID of the ContentType (Model) schema' })
  @IsUUID()
  @IsNotEmpty()
  contentTypeId: string;

  @ApiPropertyOptional({ example: 'TEMPLATE', enum: ['TEMPLATE', 'ENTRY'], description: 'Source type: TEMPLATE (dynamic) or ENTRY (predefined)' })
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiPropertyOptional({ example: 'uuid-entry-id', description: 'UUID of the predefined ContentEntry if sourceType is ENTRY' })
  @IsUUID()
  @IsOptional()
  entryId?: string;

  @ApiProperty({ example: 'uuid-queue-id', description: 'Target dynamic BullMQ queue UUID' })
  @IsUUID()
  @IsNotEmpty()
  queueId: string;

  @ApiPropertyOptional({ example: 'billing@company.com', description: 'Default fallback recipient email' })
  @IsEmail()
  @IsOptional()
  defaultTo?: string;

  @ApiPropertyOptional({ example: 'audit@company.com' })
  @IsEmail()
  @IsOptional()
  defaultCc?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
