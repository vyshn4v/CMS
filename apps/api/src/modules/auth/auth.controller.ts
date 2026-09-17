import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleAuthGuard, JwtAuthGuard } from './guards/auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RedisService } from '../redis/redis.service';

/**
 * Controller handling Google OAuth redirection, session cookies, and user info.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login', description: 'Redirects to Google for authentication' })
  async googleAuth() {
    // Passport initiates the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback', description: 'Handles the callback from Google OAuth' })
  @ApiResponse({ status: 302, description: 'Redirects to dashboard on success, login on failure' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:5173');

    try {
      const googleUser = (req as any).user;
      if (!googleUser) {
        return res.redirect(`${clientUrl}/login?error=unauthorized`);
      }

      const { token } = await this.authService.validateGoogleUser(googleUser);

      // Set secure HttpOnly cookie for web client
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.redirect(`${clientUrl}/dashboard`);
    } catch (err: any) {
      return res.redirect(`${clientUrl}/login?error=forbidden`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get current user profile', description: 'Returns the currently logged-in user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser('sub') userId: string) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.authService.getMe(userId);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user', description: 'Clears the JWT session cookie and revokes server tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    if (user?.sub || user?.id) {
      await this.redisService.revokeUserTokens(user.sub || user.id);
    } else {
      const token = req.cookies?.['jwt'] || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload?.sub) {
              await this.redisService.revokeUserTokens(payload.sub);
            }
          }
        } catch {
          // Ignore decode errors on logout
        }
      }
    }

    res.clearCookie('jwt');
    return res.status(200).json({ status: 200, data: { message: 'Logged out successfully' } });
  }
}
