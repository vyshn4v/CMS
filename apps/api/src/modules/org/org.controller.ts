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

/**
 * Controller handling organization settings, memberships, and member invitations.
 */
@Controller('orgs')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get()
  async listUserOrgs(@CurrentUser('sub') userId: string) {
    return this.orgService.listUserOrgs(userId);
  }

  @Post()
  async createOrg(
    @CurrentUser('sub') userId: string,
    @Body() body: CreateOrganizationInput,
  ) {
    return this.orgService.createOrg(userId, body);
  }

  @Get(':orgId')
  @RequirePermissions(Permissions.ORG_READ)
  async getOrg(@Param('orgId') orgId: string) {
    return this.orgService.getOrg(orgId);
  }

  @Patch(':orgId')
  @RequirePermissions(Permissions.ORG_UPDATE)
  async updateOrg(
    @Param('orgId') orgId: string,
    @Body() body: UpdateOrganizationInput,
  ) {
    return this.orgService.updateOrg(orgId, body);
  }

  @Get(':orgId/members')
  @RequirePermissions(Permissions.ORG_READ)
  async listMembers(@Param('orgId') orgId: string) {
    return this.orgService.listMembers(orgId);
  }

  @Post(':orgId/members/invite')
  @RequirePermissions(Permissions.ORG_INVITE)
  async inviteMember(
    @Param('orgId') orgId: string,
    @Body() body: InviteMemberInput,
  ) {
    return this.orgService.inviteMember(orgId, body);
  }

  @Patch(':orgId/members/:memberId/role')
  @RequirePermissions(Permissions.ROLE_MANAGE)
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberRoleInput,
  ) {
    return this.orgService.updateMemberRole(orgId, memberId, body);
  }

  @Delete(':orgId/members/:memberId')
  @RequirePermissions(Permissions.ORG_REMOVE_MEMBER)
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('sub') currentUserId: string,
  ) {
    return this.orgService.removeMember(orgId, memberId, currentUserId);
  }
}
