import { IsString, IsOptional, IsUUID, IsBoolean, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSchedulerDto {
  @ApiPropertyOptional({ example: 'Updated Order Invoices' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  contentTypeId?: string | null;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  queueId?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  defaultTo?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  defaultCc?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
