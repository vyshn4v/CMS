import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from '../../modules/api-key/api-key.service';

/**
 * Guard verifying incoming Bearer API keys against active organization credentials.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const xApiKey = request.headers['x-api-key'];

    let rawToken: string | null = null;

    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.trim().split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        rawToken = parts[1];
      }
    }

    if (!rawToken && xApiKey && typeof xApiKey === 'string') {
      rawToken = xApiKey.trim();
    }

    if (!rawToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing API Key. Provide via "Authorization: Bearer <key>" header',
      });
    }

    const keyRecord = await this.apiKeyService.validateKey(rawToken);
    if (!keyRecord) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid, inactive, or expired API Key',
      });
    }

    // Optional cross-check if X-Org-Id header is supplied
    const explicitOrgId = request.headers['x-org-id'];
    if (explicitOrgId && explicitOrgId !== keyRecord.orgId) {
      throw new UnauthorizedException({
        code: 'ORG_MISMATCH',
        message: 'API Key does not belong to the specified organization',
      });
    }

    // Attach verified API Key and Org context to the request
    request.apiKey = keyRecord;
    request.orgId = keyRecord.orgId;
    request.org = keyRecord.org;

    return true;
  }
}
