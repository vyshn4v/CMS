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
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions, CreateApiKeyInput } from '@cms/shared-types';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

/**
 * Controller exposing endpoints for organization API key generation, listing, and revocation.
 */
@ApiTags('API Keys')
@ApiBearerAuth('bearer')
@Controller('orgs/:orgId/api-keys')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * List all API keys for an organization.
   */
  @Get()
  @RequirePermissions(Permissions.APIKEY_READ)
  @ApiOperation({ summary: 'List API keys', description: 'Returns all API keys for an organization' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async listKeys(@Param('orgId') orgId: string) {
    return this.apiKeyService.listKeys(orgId);
  }

  /**
   * Create a new API key. The plaintext key is returned only in this response.
   */
  @Post()
  @RequirePermissions(Permissions.APIKEY_CREATE)
  @ApiOperation({ summary: 'Create API key', description: 'Creates a new API key' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createKey(
    @Param('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: CreateApiKeyInput,
  ) {
    return this.apiKeyService.createKey(orgId, userId, body);
  }

  /**
   * Revoke an API key.
   */
  @Delete(':id')
  @RequirePermissions(Permissions.APIKEY_REVOKE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke API key', description: 'Revokes an API key' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'API Key ID' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  async revokeKey(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.revokeKey(orgId, id);
  }
}
