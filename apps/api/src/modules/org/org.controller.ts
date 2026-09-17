import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OrgService } from './org.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  Permissions,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from '@cms/shared-types';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/org.dto';

/**
 * Controller handling organization settings, memberships, and member invitations.
 */
@ApiTags('Organizations')
@ApiBearerAuth('bearer')
@Controller('orgs')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get()
  @ApiOperation({ summary: 'List user organizations', description: 'Returns all organizations the user belongs to' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async listUserOrgs(@CurrentUser('sub') userId: string) {
    return this.orgService.listUserOrgs(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization', description: 'Creates a new organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  async createOrg(
    @CurrentUser('sub') userId: string,
    @Body() body: CreateOrganizationInput,
  ) {
    return this.orgService.createOrg(userId, body);
  }

  @Get(':orgId')
  @RequirePermissions(Permissions.ORG_READ)
  @ApiOperation({ summary: 'Get organization', description: 'Get organization details by ID' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  async getOrg(@Param('orgId') orgId: string) {
    return this.orgService.getOrg(orgId);
  }

  @Patch(':orgId')
  @RequirePermissions(Permissions.ORG_UPDATE)
  @ApiOperation({ summary: 'Update organization', description: 'Updates organization details' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  async updateOrg(
    @Param('orgId') orgId: string,
    @Body() body: UpdateOrganizationInput,
  ) {
    return this.orgService.updateOrg(orgId, body);
  }

  @Get(':orgId/members')
  @RequirePermissions(Permissions.ORG_READ)
  @ApiOperation({ summary: 'List organization members', description: 'Returns all members of an organization' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'List of organization members' })
  async listMembers(@Param('orgId') orgId: string) {
    return this.orgService.listMembers(orgId);
  }

  @Post(':orgId/members/invite')
  @RequirePermissions(Permissions.ORG_INVITE)
  @ApiOperation({ summary: 'Invite member', description: 'Invites a user to the organization' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiBody({ type: InviteMemberDto })
  @ApiResponse({ status: 201, description: 'Member invited successfully' })
  async inviteMember(
    @Param('orgId') orgId: string,
    @Body() body: InviteMemberInput,
  ) {
    return this.orgService.inviteMember(orgId, body);
  }

  @Patch(':orgId/members/:memberId/role')
  @RequirePermissions(Permissions.ROLE_MANAGE)
  @ApiOperation({ summary: 'Update member role', description: 'Updates the role of an organization member' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', type: 'string', description: 'Member ID' })
  @ApiBody({ type: UpdateMemberRoleDto })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberRoleInput,
  ) {
    return this.orgService.updateMemberRole(orgId, memberId, body);
  }

  @Delete(':orgId/members/:memberId')
  @RequirePermissions(Permissions.ORG_REMOVE_MEMBER)
  @ApiOperation({ summary: 'Remove member', description: 'Removes a member from the organization' })
  @ApiParam({ name: 'orgId', type: 'string', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', type: 'string', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('sub') currentUserId: string,
  ) {
    return this.orgService.removeMember(orgId, memberId, currentUserId);
  }
}
