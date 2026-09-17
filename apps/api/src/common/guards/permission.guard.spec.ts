import { ExecutionContext, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemRoles } from '@cms/shared-types';

describe('PermissionGuard (SEC-01 BOLA / IDOR Protection)', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    prisma = {
      orgMember: {
        findUnique: jest.fn(),
      },
    };

    guard = new PermissionGuard(reflector, prisma);
  });

  const createMockContext = (req: any): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as any;

  it('allows access if no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    const context = createMockContext({});
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException if user is not authenticated', async () => {
    reflector.getAllAndOverride.mockReturnValue(['content.read']);
    const context = createMockContext({ user: null });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('SEC-01: throws BadRequestException if X-Org-Id header and route parameter orgId mismatch (BOLA attempt)', async () => {
    reflector.getAllAndOverride.mockReturnValue(['schema.update']);
    const req = {
      user: { sub: 'attacker-uuid' },
      headers: { 'x-org-id': 'org-attacker' },
      params: { orgId: 'org-victim' },
    };
    const context = createMockContext(req);

    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Mismatched organization context: X-Org-Id header does not match route :orgId parameter',
    );
  });

  it('SEC-01: accepts request when header and route parameter orgId match', async () => {
    reflector.getAllAndOverride.mockReturnValue(['content.read']);
    const req = {
      user: { sub: 'user-uuid' },
      headers: { 'x-org-id': 'org-1' },
      params: { orgId: 'org-1' },
    };
    prisma.orgMember.findUnique.mockResolvedValue({
      role: {
        isSystem: false,
        name: 'Editor',
        rolePermissions: [{ permission: { action: 'content.read' } }],
      },
    });

    const context = createMockContext(req);
    expect(await guard.canActivate(context)).toBe(true);
    expect(req['orgId']).toBe('org-1');
  });

  it('SEC-01: accepts request when only route param is provided', async () => {
    reflector.getAllAndOverride.mockReturnValue(['content.read']);
    const req = {
      user: { sub: 'user-uuid' },
      headers: {},
      params: { orgId: 'org-1' },
    };
    prisma.orgMember.findUnique.mockResolvedValue({
      role: {
        isSystem: false,
        name: 'Editor',
        rolePermissions: [{ permission: { action: 'content.read' } }],
      },
    });

    const context = createMockContext(req);
    expect(await guard.canActivate(context)).toBe(true);
    expect(req['orgId']).toBe('org-1');
  });

  it('SEC-01: accepts request when only header is provided', async () => {
    reflector.getAllAndOverride.mockReturnValue(['content.read']);
    const req = {
      user: { sub: 'user-uuid' },
      headers: { 'x-org-id': 'org-1' },
      params: {},
    };
    prisma.orgMember.findUnique.mockResolvedValue({
      role: {
        isSystem: false,
        name: 'Editor',
        rolePermissions: [{ permission: { action: 'content.read' } }],
      },
    });

    const context = createMockContext(req);
    expect(await guard.canActivate(context)).toBe(true);
    expect(req['orgId']).toBe('org-1');
  });

  it('allows Super Admin full access regardless of specific permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(['super.secret.perm']);
    const req = {
      user: { sub: 'admin-uuid' },
      params: { orgId: 'org-1' },
      headers: {},
    };
    prisma.orgMember.findUnique.mockResolvedValue({
      role: {
        isSystem: true,
        name: SystemRoles.SUPER_ADMIN,
        rolePermissions: [],
      },
    });

    const context = createMockContext(req);
    expect(await guard.canActivate(context)).toBe(true);
  });
});
