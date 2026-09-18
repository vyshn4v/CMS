import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions, ScheduledEmailStatus } from '@cms/shared-types';
import { CreateSchedulerDto } from './dto/create-scheduler.dto';
import { UpdateSchedulerDto } from './dto/update-scheduler.dto';
import { DispatchEmailDto } from './dto/dispatch-email.dto';

@ApiTags('Email Schedulers')
@ApiBearerAuth('bearer')
@Controller('orgs/:orgId/schedulers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  @RequirePermissions(Permissions.SCHEDULER_READ)
  @ApiOperation({ summary: 'List all email schedulers for an organization' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listSchedulers(
    @Param('orgId') orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.schedulerService.listSchedulers(orgId, page, limit);
  }

  @Get('system-defaults')
  @RequirePermissions(Permissions.SCHEDULER_READ)
  @ApiOperation({ summary: 'Get system-level scheduler defaults (SMTP_FROM and admin recipient)' })
  @ApiParam({ name: 'orgId', type: 'string' })
  async getSystemDefaults() {
    return this.schedulerService.getSystemDefaults();
  }

  @Get(':id')
  @RequirePermissions(Permissions.SCHEDULER_READ)
  @ApiOperation({ summary: 'Get details of a specific scheduler' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async getScheduler(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schedulerService.getScheduler(orgId, id);
  }

  @Post()
  @RequirePermissions(Permissions.SCHEDULER_CREATE)
  @ApiOperation({ summary: 'Create a new email scheduler pipeline' })
  @ApiParam({ name: 'orgId', type: 'string' })
  async createScheduler(
    @Param('orgId') orgId: string,
    @Body() dto: CreateSchedulerDto,
  ) {
    return this.schedulerService.createScheduler(orgId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.SCHEDULER_UPDATE)
  @ApiOperation({ summary: 'Update an email scheduler' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async updateScheduler(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSchedulerDto,
  ) {
    return this.schedulerService.updateScheduler(orgId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.SCHEDULER_DELETE)
  @ApiOperation({ summary: 'Delete an email scheduler' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async deleteScheduler(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schedulerService.deleteScheduler(orgId, id);
  }

  @Post(':id/dispatch')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(Permissions.SCHEDULER_DISPATCH)
  @ApiOperation({ summary: 'Dispatch or schedule an email delivery via UI/User session' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async dispatchEmail(
    @Param('orgId') orgId: string,
    @Param('id') schedulerId: string,
    @Body() dto: DispatchEmailDto,
  ) {
    return this.schedulerService.dispatchEmail(orgId, schedulerId, dto);
  }
}

@ApiTags('Scheduled Emails')
@ApiBearerAuth('bearer')
@Controller('orgs/:orgId/scheduled-emails')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ScheduledEmailController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  @RequirePermissions(Permissions.SCHEDULER_READ)
  @ApiOperation({ summary: 'List and search scheduled emails' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ScheduledEmailStatus })
  @ApiQuery({ name: 'schedulerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listScheduledEmails(
    @Param('orgId') orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ScheduledEmailStatus,
    @Query('schedulerId') schedulerId?: string,
    @Query('search') search?: string,
  ) {
    return this.schedulerService.listScheduledEmails(orgId, {
      page,
      limit,
      status,
      schedulerId,
      search,
    });
  }

  @Get(':id')
  @RequirePermissions(Permissions.SCHEDULER_READ)
  @ApiOperation({ summary: 'Get details of a scheduled email' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async getScheduledEmail(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schedulerService.getScheduledEmail(orgId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions(Permissions.SCHEDULER_UPDATE)
  @ApiOperation({ summary: 'Cancel a pending scheduled email' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async cancelScheduledEmail(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schedulerService.cancelScheduledEmail(orgId, id);
  }

  @Post(':id/retry')
  @RequirePermissions(Permissions.SCHEDULER_DISPATCH)
  @ApiOperation({ summary: 'Retry a failed email delivery' })
  @ApiParam({ name: 'orgId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  async retryScheduledEmail(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.schedulerService.retryScheduledEmail(orgId, id);
  }
}

@ApiTags('Public Dispatch API')
@ApiSecurity('api-key')
@ApiSecurity('x-api-key')
@Controller('schedulers/dispatch')
@UseGuards(ApiKeyGuard)
export class PublicSchedulerDispatchController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger an email dispatch using organization API key' })
  async dispatchWithApiKey(@Req() req: any, @Body() dto: DispatchEmailDto) {
    const orgId = req.orgId;
    if (!dto.schedulerId) {
      throw new BadRequestException('Property "schedulerId" is required in request payload');
    }
    return this.schedulerService.dispatchEmail(orgId, dto.schedulerId, dto);
  }
}
