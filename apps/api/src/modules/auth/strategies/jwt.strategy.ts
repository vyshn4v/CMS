import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@cms/shared-types';
import { RedisService } from '../../redis/redis.service';

/**
 * Passport strategy extracting JWT from cookies or Authorization Bearer header.
 * Enforces cryptographic verification and checks server-side Redis revocation status.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (req && req.cookies && req.cookies['jwt']) {
            return req.cookies['jwt'];
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload & { id: string }> {
    // SEC-17: Server-side token revocation check
    if (this.redisService?.isReady() && payload.sub) {
      const isRevoked = await this.redisService.isTokenRevoked(payload.sub, payload.iat || 0);
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked. Please log in again.');
      }
    }

    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }
}
