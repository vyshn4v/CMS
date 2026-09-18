import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions } from '@cms/shared-types';
import { CreateQueueDto } from './dto/create-queue.dto';

@ApiTags('Email Queues')
@ApiBearerAuth('bearer')
@Controller('orgs/:orgId/queues')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @RequirePermissions(Permissions.QUEUE_READ)
  @ApiOperation({ summary: 'List all queues for an organization' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of dynamic queues' })
  async listQueues(@Param('orgId') orgId: string) {
    return this.queueService.listQueues(orgId);
  }

  @Post()
  @RequirePermissions(Permissions.QUEUE_MANAGE)
  @ApiOperation({ summary: 'Create a new dynamic queue' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiResponse({ status: 201, description: 'Queue created with status PENDING_INITIALIZATION' })
  async createQueue(
    @Param('orgId') orgId: string,
    @Body() dto: CreateQueueDto,
  ) {
    return this.queueService.createQueue(orgId, dto);
  }

  @Post('reinitialize')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.QUEUE_MANAGE)
  @ApiOperation({ summary: 'Reinitialize dynamic BullMQ queues and workers' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Runtime queues successfully initialized' })
  async reinitializeQueues(@Param('orgId') orgId: string) {
    return this.queueService.reinitialize(orgId);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.QUEUE_MANAGE)
  @ApiOperation({ summary: 'Delete a dynamic queue' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Queue deleted successfully' })
  async deleteQueue(
    @Param('orgId') orgId: string,
    @Param('id') queueId: string,
  ) {
    return this.queueService.deleteQueue(orgId, queueId);
  }
}
