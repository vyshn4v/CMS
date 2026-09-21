/**
 * DTOs and contracts for API Key management.
 */

export interface ApiKeyDto {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  expiresAt?: string | null;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // The full raw key (sk_live_...), returned ONCE
  prefix: string;
  createdAt: string;
}
