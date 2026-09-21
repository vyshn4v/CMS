import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, UserDto, SystemRoles } from '@cms/shared-types';

export interface GoogleAuthProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * Service managing Google OAuth validation, allowlist enforcement, and user sessions.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate Google profile against ALLOWED_EMAILS and upsert user record.
   */
  async validateGoogleUser(profile: GoogleAuthProfile): Promise<{ token: string; user: UserDto }> {
    const rawAllowed = this.configService.get<string>('ALLOWED_EMAILS', '');
    const allowedEmails = rawAllowed
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = profile.email.toLowerCase();

    // Enforce allowlist gate if ALLOWED_EMAILS is defined
    if (allowedEmails.length > 0 && !allowedEmails.includes(userEmail)) {
      this.logger.warn(`Rejected login attempt from unlisted email: ${userEmail}`);
      throw new UnauthorizedException('Email is not authorized to access this system');
    }

    // Upsert user in database
    const user = await this.prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        googleId: profile.googleId,
      },
      create: {
        email: userEmail,
        googleId: profile.googleId,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });

    // Ensure user has at least one organization
    const membershipCount = await this.prisma.orgMember.count({
      where: { userId: user.id },
    });

    if (membershipCount === 0) {
      await this.createDefaultWorkspace(user);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Automatically bootstrap a default organization for new users.
   */
  private async createDefaultWorkspace(user: { id: string; name: string }) {
    let superAdminRole = await this.prisma.role.findFirst({
      where: { name: SystemRoles.SUPER_ADMIN, orgId: null },
    });

    if (!superAdminRole) {
      superAdminRole = await this.prisma.role.create({
        data: {
          name: SystemRoles.SUPER_ADMIN,
          isSystem: true,
          description: 'Full system administrator',
        },
      });
    }

    const orgSlug = `workspace-${user.id.slice(0, 8)}`;
    const org = await this.prisma.organization.create({
      data: {
        name: `${user.name}'s Workspace`,
        slug: orgSlug,
      },
    });

    await this.prisma.orgMember.create({
      data: {
        userId: user.id,
        orgId: org.id,
        roleId: superAdminRole.id,
      },
    });

    this.logger.log(`Created default workspace for ${user.name} (${org.name})`);
  }

  /**
   * Retrieve current user profile and associated organizations with roles.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            org: true,
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      organizations: user.memberships.map((m) => {
        const perms =
          m.role.isSystem && m.role.name === SystemRoles.SUPER_ADMIN
            ? ['*']
            : m.role.rolePermissions.map((rp) => rp.permission.action);

        return {
          id: m.org.id,
          name: m.org.name,
          slug: m.org.slug,
          role: m.role.name,
          permissions: perms,
        };
      }),
    };
  }
}
