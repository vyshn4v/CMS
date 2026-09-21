import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQueueDto {
  @ApiProperty({ example: 'high-priority', description: 'Unique queue identifier per organization' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-_]+$/, {
    message: 'Queue name may only contain lowercase letters, numbers, hyphens, and underscores',
  })
  name: string;

  @ApiPropertyOptional({ example: 'Transactional urgent alerts' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 5, default: 5, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  concurrency?: number = 5;
}
