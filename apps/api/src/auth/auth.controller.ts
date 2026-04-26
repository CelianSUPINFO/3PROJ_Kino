import {
  Body,
  Controller,
  Get,
  Next,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request, NextFunction } from 'express';
import * as passport from 'passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.displayName);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('google/mobile')
  googleMobile(@Res() res: Response) {
    return res.redirect(302, '/v1/auth/google?mobile=1');
  }

  @Get('google')
  googleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    const state = req.query.mobile === '1' ? 'mobile' : 'web';
    passport.authenticate('google', {
      scope: ['email', 'profile'],
      state,
      session: false,
    })(req, res, next);
  }

  @Get('google/callback')
  googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    passport.authenticate(
      'google',
      { session: false },
      async (err: Error | null, user?: User) => {
        const webBase = this.config.get<string>(
          'FRONTEND_URL',
          'http://localhost:3001',
        );
        if (err || !user) {
          return res.redirect(302, `${webBase}/login?error=oauth`);
        }
        const tokens = await this.auth.issueTokens(user.id, user.email, user.role);
        const state = typeof req.query.state === 'string' ? req.query.state : 'web';
        if (state === 'mobile') {
          const scheme = this.config.get<string>('MOBILE_OAUTH_SCHEME', 'kino');
          const url = `${scheme}://oauth?access=${encodeURIComponent(tokens.accessToken)}&refresh=${encodeURIComponent(tokens.refreshToken)}`;
          return res.redirect(302, url);
        }
        const url = `${webBase}/oauth?access=${encodeURIComponent(tokens.accessToken)}&refresh=${encodeURIComponent(tokens.refreshToken)}`;
        return res.redirect(302, url);
      },
    )(req, res, next);
  }
}
