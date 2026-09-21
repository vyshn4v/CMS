import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyDto, CreateApiKeyInput, CreateApiKeyResponse } from '@cms/shared-types';

/**
 * Service managing API keys creation, hashing, listing, revocation, and validation.
 */
@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a new cryptographically secure API key.
   * Full plaintext key is returned ONCE to the caller; only prefix and SHA-256 hash are stored.
   */
  async createKey(
    orgId: string,
    userId: string,
    input: CreateApiKeyInput,
  ): Promise<CreateApiKeyResponse> {
    if (!input.name || input.name.trim().length < 2) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'API Key name must be at least 2 characters long',
      });
    }

    // Generate random 24 bytes hex string prefixed with sk_live_
    const randomSecret = crypto.randomBytes(24).toString('hex');
    const fullKey = `sk_live_${randomSecret}`;
    const prefix = fullKey.substring(0, 12); // "sk_live_xxxx"
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const record = await this.prisma.apiKey.create({
      data: {
        orgId,
        createdById: userId,
        name: input.name.trim(),
        keyPrefix: prefix,
        keyHash: hash,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    return {
      id: record.id,
      name: record.name,
      key: fullKey,
      prefix: record.keyPrefix,
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Lists all API keys for an organization (prefix only, never plaintext secret).
   */
  async listKeys(orgId: string): Promise<ApiKeyDto[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      orgId: k.orgId,
      name: k.name,
      keyPrefix: k.keyPrefix,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null,
      createdAt: k.createdAt.toISOString(),
    }));
  }

  /**
   * Revokes and removes an API key.
   */
  async revokeKey(orgId: string, id: string): Promise<{ success: boolean }> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, orgId },
    });

    if (!key) {
      throw new NotFoundException({
        code: 'API_KEY_NOT_FOUND',
        message: `API Key ${id} not found in this organization`,
      });
    }

    await this.prisma.apiKey.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Validates a raw bearer token against hashed database records.
   * If valid and not expired, updates lastUsedAt and returns the associated key record.
   */
  async validateKey(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: {
        org: true,
      },
    });

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Asynchronously record lastUsedAt without blocking
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return apiKey;
  }
}
