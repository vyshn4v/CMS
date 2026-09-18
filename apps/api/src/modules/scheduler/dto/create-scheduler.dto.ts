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

  @ApiProperty({ example: 'uuid-template-id', description: 'UUID of the Handlebars Template to render' })
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional({ example: 'uuid-content-type-id', description: 'Optional UUID of the ContentType (Model) to bind schema fields' })
  @IsUUID()
  @IsOptional()
  contentTypeId?: string;

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
