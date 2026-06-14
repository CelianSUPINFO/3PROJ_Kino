import {
  Body,
  Controller,
  Get,
  Logger,
  Next,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request, NextFunction } from 'express';
import * as passport from 'passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '@prisma/client';
import {
  ChangePasswordDto,
  RequestEmailActionDto,
  ResetPasswordDto,
  VerifyTokenDto,
} from './dto/recovery.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

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

  @Post('password/request')
  requestPasswordReset(@Body() dto: RequestEmailActionDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('email/request-verification')
  requestVerification(@Body() dto: RequestEmailActionDto) {
    return this.auth.requestEmailVerification(dto.email);
  }

  @Post('email/verify')
  verifyEmail(@Body() dto: VerifyTokenDto) {
    return this.auth.verifyEmail(dto.token);
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
    const target = req.query.mobile === '1' ? 'mobile' : 'web';
    const returnTo =
      target === 'web' && typeof req.query.returnTo === 'string'
        ? this.sanitizeReturnTo(req.query.returnTo)
        : undefined;
    const state = this.encodeState({ target, returnTo });
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
          this.logger.warn(
            `Google OAuth callback failed: ${err?.message ?? 'missing user'}`,
          );
          return res.redirect(302, `${webBase}/login?error=oauth`);
        }
        const tokens = await this.auth.issueTokens(user.id, user.email, user.role);
        const state = this.decodeState(
          typeof req.query.state === 'string' ? req.query.state : undefined,
        );
        if (state.target === 'mobile') {
          const scheme = this.config.get<string>('MOBILE_OAUTH_SCHEME', 'kino');
          const url = `${scheme}://oauth?access=${encodeURIComponent(tokens.accessToken)}&refresh=${encodeURIComponent(tokens.refreshToken)}`;
          return res.redirect(302, url);
        }
        const returnBase = state.returnTo
          ? this.sanitizeReturnTo(state.returnTo) ?? webBase
          : webBase;
        const url = `${returnBase}/oauth?access=${encodeURIComponent(tokens.accessToken)}&refresh=${encodeURIComponent(tokens.refreshToken)}`;
        return res.redirect(302, url);
      },
    )(req, res, next);
  }

  private encodeState(state: { target: 'web' | 'mobile'; returnTo?: string }) {
    return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
  }

  private decodeState(raw?: string): { target: 'web' | 'mobile'; returnTo?: string } {
    if (!raw) return { target: 'web' };
    if (raw === 'mobile' || raw === 'web') return { target: raw };
    try {
      const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
        target?: string;
        returnTo?: string;
      };
      return {
        target: parsed.target === 'mobile' ? 'mobile' : 'web',
        returnTo: typeof parsed.returnTo === 'string' ? parsed.returnTo : undefined,
      };
    } catch {
      return { target: 'web' };
    }
  }

  private sanitizeReturnTo(raw: string) {
    try {
      const origin = new URL(raw).origin;
      return this.allowedWebOrigins().includes(origin) ? origin : undefined;
    } catch {
      return undefined;
    }
  }

  private allowedWebOrigins() {
    const values = [
      this.config.get<string>('FRONTEND_URL'),
      ...(this.config.get<string>('CORS_ORIGINS') ?? '').split(','),
    ];
    return values
      .map((origin) => origin?.trim())
      .filter((origin): origin is string => Boolean(origin));
  }
}
