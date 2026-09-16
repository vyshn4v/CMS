import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Service managing Redis connection, key-value operations, TTLs, and cache invalidation.
 * Designed with graceful degradation: cache read/write failures never crash API requests.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    try {
      const options: RedisOptions = {
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn('Redis reconnection attempts exhausted. Operating in cache-bypass mode.');
            return null;
          }
          return Math.min(times * 500, 2000);
        },
        enableReadyCheck: true,
        lazyConnect: true,
      };

      this.client = new Redis(redisUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis client connected successfully');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect().catch((err) => {
        this.logger.warn(`Initial Redis connection failed (${err.message}). Bypassing cache until reconnected.`);
      });
    } catch (err: any) {
      this.logger.warn(`Redis initialization failed: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }

  /**
   * Returns whether Redis is connected and ready to serve requests.
   */
  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Retrieves and deserializes a cached value.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady() || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err: any) {
      this.logger.warn(`Redis GET failed for key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Serializes and caches a value with an optional TTL in seconds.
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Redis SET failed for key "${key}": ${err.message}`);
    }
  }

  /**
   * Deletes one or more specific keys from cache.
   */
  async del(key: string | string[]): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      if (Array.isArray(key)) {
        if (key.length > 0) await this.client.del(...key);
      } else {
        await this.client.del(key);
      }
    } catch (err: any) {
      this.logger.warn(`Redis DEL failed for key "${key}": ${err.message}`);
    }
  }

  /**
   * Deletes all keys matching a glob pattern using SCAN for non-blocking iteration.
   */
  async delByPattern(pattern: string): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err: any) {
      this.logger.warn(`Redis delByPattern failed for pattern "${pattern}": ${err.message}`);
    }
  }

  // ============================================================================
  // Specialized Domain Cache Utilities
  // ============================================================================

  // 1. Template Cache (TTL: 24 hours = 86400s)
  async getPublishedTemplate<T>(templateId: string): Promise<T | null> {
    return this.get<T>(`tmpl:pub:${templateId}`);
  }

  async setPublishedTemplate(templateId: string, data: any): Promise<void> {
    await this.set(`tmpl:pub:${templateId}`, data, 86400);
  }

  async invalidateTemplate(templateId: string, orgId?: string): Promise<void> {
    await this.del(`tmpl:pub:${templateId}`);
    if (orgId) {
      await this.delByPattern(`tmpl:pub:schema:${orgId}:*`);
    }
  }

  // 2. Published Content Entry Cache (TTL: 1 hour = 3600s)
  async getPublishedEntry<T>(entryId: string): Promise<T | null> {
    return this.get<T>(`entry:pub:${entryId}`);
  }

  async setPublishedEntry(entryId: string, data: any): Promise<void> {
    await this.set(`entry:pub:${entryId}`, data, 3600);
  }

  async invalidateEntry(entryId: string): Promise<void> {
    await this.del(`entry:pub:${entryId}`);
  }

  // 3. User RBAC Permissions Cache (TTL: 5 minutes = 300s)
  async getUserPermissions(userId: string, orgId: string): Promise<string[] | null> {
    return this.get<string[]>(`user:perms:${userId}:${orgId}`);
  }

  async setUserPermissions(userId: string, orgId: string, permissions: string[]): Promise<void> {
    await this.set(`user:perms:${userId}:${orgId}`, permissions, 300);
  }

  async invalidateUserPermissions(userId: string, orgId?: string): Promise<void> {
    if (orgId) {
      await this.del(`user:perms:${userId}:${orgId}`);
    } else {
      await this.delByPattern(`user:perms:${userId}:*`);
    }
  }

  async invalidateAllOrgPermissions(orgId: string): Promise<void> {
    await this.delByPattern(`user:perms:*:${orgId}`);
  }
}
