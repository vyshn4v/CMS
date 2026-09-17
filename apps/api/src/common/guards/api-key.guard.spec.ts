import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from '../../modules/api-key/api-key.service';
import { ExecutionContext } from '@nestjs/common';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let apiKeyService: jest.Mocked<ApiKeyService>;

  const mockKeyRecord = {
    id: 'key-1',
    orgId: 'org-123',
    name: 'Production Key',
    keyPrefix: 'sk_live_1234',
    isActive: true,
    org: { id: 'org-123', name: 'Acme Corp' },
  };

  beforeEach(() => {
    apiKeyService = {
      validateKey: jest.fn().mockResolvedValue(mockKeyRecord),
    } as any;
    guard = new ApiKeyGuard(apiKeyService);
  });

  const createMockContext = (headers: Record<string, string>) => {
    const req: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow request with "Authorization: Bearer <key>"', async () => {
    const context = createMockContext({ authorization: 'Bearer sk_live_validkey' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(apiKeyService.validateKey).toHaveBeenCalledWith('sk_live_validkey');
  });

  it('should allow request with raw "Authorization: <key>" (from Swagger)', async () => {
    const context = createMockContext({ authorization: 'sk_live_validkey' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(apiKeyService.validateKey).toHaveBeenCalledWith('sk_live_validkey');
  });

  it('should allow request with "x-api-key" header', async () => {
    const context = createMockContext({ 'x-api-key': 'sk_live_validkey' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(apiKeyService.validateKey).toHaveBeenCalledWith('sk_live_validkey');
  });

  it('should throw UnauthorizedException when no key is provided', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when key is invalid', async () => {
    apiKeyService.validateKey.mockResolvedValue(null);
    const context = createMockContext({ authorization: 'sk_live_invalid' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when X-Org-Id does not match key orgId', async () => {
    const context = createMockContext({
      authorization: 'sk_live_validkey',
      'x-org-id': 'different-org-456',
    });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
