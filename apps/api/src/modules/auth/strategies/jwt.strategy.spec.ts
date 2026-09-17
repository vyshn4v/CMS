import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret-with-minimum-32-chars-long-value'),
    } as any;

    redisService = {
      isReady: jest.fn().mockReturnValue(true),
      isTokenRevoked: jest.fn().mockResolvedValue(false),
    } as any;

    strategy = new JwtStrategy(configService, redisService);
  });

  it('should validate and return user payload when token is not revoked', async () => {
    const payload = {
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
    };

    const result = await strategy.validate(payload);
    expect(result).toEqual({
      id: 'user-123',
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
    });
    expect(redisService.isTokenRevoked).toHaveBeenCalledWith('user-123', payload.iat);
  });

  it('should throw UnauthorizedException when token is revoked', async () => {
    redisService.isTokenRevoked.mockResolvedValue(true);

    const payload = {
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000) - 1000,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    expect(redisService.isTokenRevoked).toHaveBeenCalledWith('user-123', payload.iat);
  });

  it('should allow authentication if Redis is unavailable (graceful degradation)', async () => {
    redisService.isReady.mockReturnValue(false);

    const payload = {
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
    };

    const result = await strategy.validate(payload);
    expect(result.id).toBe('user-123');
    expect(redisService.isTokenRevoked).not.toHaveBeenCalled();
  });
});
