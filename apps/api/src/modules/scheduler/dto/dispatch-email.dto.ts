import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DispatchEmailDto {
  @ApiPropertyOptional({ example: 'uuid-scheduler-id', description: 'Target Scheduler UUID (required when invoking root dispatch endpoint)' })
  @IsUUID()
  @IsOptional()
  schedulerId?: string;

  @ApiPropertyOptional({ example: 'customer@example.com', description: 'Recipient email address (defaults to .env user if omitted)' })
  @IsString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ example: 'manager@example.com', description: 'Carbon copy recipient' })
  @IsString()
  @IsOptional()
  cc?: string;

  @ApiPropertyOptional({ example: 'audit@example.com', description: 'Blind carbon copy recipient' })
  @IsString()
  @IsOptional()
  bcc?: string;

  @ApiPropertyOptional({
    example: '2026-09-18T18:00:00Z',
    description: 'Scheduled execution time. If omitted or past, email is dispatched immediately.',
  })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @ApiPropertyOptional({ example: 'uuid-queue-id', description: 'Optional queue override' })
  @IsUUID()
  @IsOptional()
  queueId?: string;

  @ApiPropertyOptional({
    example: { customerName: 'Alice', orderId: 'ORD-992' },
    description: 'Dynamic data payload merged into the template context',
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
