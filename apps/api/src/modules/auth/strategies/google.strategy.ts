import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

/**
 * Passport strategy handling Google OAuth 2.0 redirection and callback verification.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', 'placeholder-client-id'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', 'placeholder-client-secret'),
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:5000/api/v1/auth/google/callback',
      ),
      scope: ['email', 'profile'],
      state: true,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails && emails[0] ? emails[0].value : '',
      name: displayName || 'CMS User',
      avatarUrl: photos && photos[0] ? photos[0].value : null,
    };
    done(null, user);
  }
}
