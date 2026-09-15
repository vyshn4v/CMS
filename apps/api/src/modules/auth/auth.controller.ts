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

/**
 * Controller handling Google OAuth redirection, session cookies, and user info.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Passport initiates the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
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
  async getMe(@CurrentUser('sub') userId: string) {
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.authService.getMe(userId);
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('jwt');
    return res.status(200).json({ status: 200, data: { message: 'Logged out successfully' } });
  }
}
