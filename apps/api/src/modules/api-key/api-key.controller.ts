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

/**
 * Controller exposing endpoints for organization API key generation, listing, and revocation.
 */
@Controller('orgs/:orgId/api-keys')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * List all API keys for an organization.
   */
  @Get()
  @RequirePermissions(Permissions.APIKEY_READ)
  async listKeys(@Param('orgId') orgId: string) {
    return this.apiKeyService.listKeys(orgId);
  }

  /**
   * Create a new API key. The plaintext key is returned only in this response.
   */
  @Post()
  @RequirePermissions(Permissions.APIKEY_CREATE)
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
  async revokeKey(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.revokeKey(orgId, id);
  }
}
