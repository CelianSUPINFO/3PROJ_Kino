import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

const SALT_ROUNDS = 12;
const PASSWORD_RESET = 'PASSWORD_RESET';
const EMAIL_VERIFY = 'EMAIL_VERIFY';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashRefresh(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async createAuthToken(userId: string, type: string, hours: number) {
    const raw = crypto.randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      this.prisma.authToken.deleteMany({ where: { userId, type } }),
      this.prisma.authToken.create({
        data: {
          userId,
          type,
          tokenHash: this.hashRefresh(raw),
          expiresAt: new Date(Date.now() + hours * 3600000),
        },
      }),
    ]);
    return raw;
  }

  private async consumeAuthToken(raw: string, type: string) {
    const row = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashRefresh(raw) },
      include: { user: true },
    });
    if (!row || row.type !== type || row.expiresAt < new Date()) {
      throw new BadRequestException('Lien invalide ou expiré');
    }
    await this.prisma.authToken.delete({ where: { id: row.id } });
    return row.user;
  }

  private async sendActionEmail(
    email: string,
    subject: string,
    path: string,
    token: string,
  ) {
    const frontend = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const url = `${frontend}${path}?token=${encodeURIComponent(token)}`;
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      if (this.config.get<string>('NODE_ENV') !== 'production') {
        return { developmentToken: token, developmentUrl: url };
      }
      this.logger.warn(`Email not sent to ${email}: RESEND_API_KEY is missing`);
      return {};
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.get<string>('EMAIL_FROM', 'Kino <onboarding@resend.dev>'),
        to: [email],
        subject,
        html: `<p>${subject}</p><p><a href="${url}">Continuer sur Kino</a></p><p>Ce lien expire bientôt.</p>`,
      }),
    });
    if (!response.ok) {
      this.logger.error(`Email provider rejected request: ${await response.text()}`);
      throw new BadRequestException("L'e-mail n'a pas pu être envoyé");
    }
    return {};
  }

  async register(email: string, password: string, displayName: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new BadRequestException('Email déjà utilisé');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });
    const verificationToken = await this.createAuthToken(user.id, EMAIL_VERIFY, 24);
    const emailResult = await this.sendActionEmail(
      user.email,
      'Validez votre adresse e-mail Kino',
      '/verify-email',
      verificationToken,
    );
    return { ...(await this.issueTokens(user.id, user.email, user.role)), ...emailResult };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      throw new UnauthorizedException('Compte suspendu');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async issueTokens(userId: string, email: string, role: Role) {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      role,
    };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '15m') as never,
    });
    const refreshRaw = crypto.randomBytes(48).toString('hex');
    const refreshHash = this.hashRefresh(refreshRaw);
    const days = Number(this.config.get<string>('JWT_REFRESH_DAYS', '14'));
    const expiresAt = new Date(Date.now() + days * 86400000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: refreshHash, expiresAt },
    });
    return { accessToken, refreshToken: refreshRaw, expiresAt };
  }

  async refresh(refreshToken: string) {
    const hash = this.hashRefresh(refreshToken);
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expirée');
    }
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    const user = await this.prisma.user.findUnique({
      where: { id: row.userId },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      throw new UnauthorizedException('Compte suspendu');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(refreshToken: string) {
    const hash = this.hashRefresh(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: hash } });
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return { ok: true };
    const token = await this.createAuthToken(user.id, PASSWORD_RESET, 1);
    const result = await this.sendActionEmail(
      user.email,
      'Réinitialisez votre mot de passe Kino',
      '/reset-password',
      token,
    );
    return { ok: true, ...result };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.consumeAuthToken(token, PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.authToken.deleteMany({ where: { userId: user.id, type: PASSWORD_RESET } }),
    ]);
    return { ok: true };
  }

  async requestEmailVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) return { ok: true };
    const token = await this.createAuthToken(user.id, EMAIL_VERIFY, 24);
    const result = await this.sendActionEmail(
      user.email,
      'Validez votre adresse e-mail Kino',
      '/verify-email',
      token,
    );
    return { ok: true, ...result };
  }

  async verifyEmail(token: string) {
    const user = await this.consumeAuthToken(token, EMAIL_VERIFY);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
    return { ok: true };
  }

  async findOrCreateGoogleUser(
    providerUserId: string,
    email: string,
    displayName: string,
  ) {
    const existing = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: { provider: 'google', providerUserId },
      },
      include: { user: true },
    });
    if (existing) {
      return existing.user;
    }
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      await this.prisma.oAuthAccount.create({
        data: {
          provider: 'google',
          providerUserId,
          userId: byEmail.id,
        },
      });
      if (!byEmail.emailVerifiedAt) {
        return this.prisma.user.update({
          where: { id: byEmail.id },
          data: { emailVerifiedAt: new Date() },
        });
      }
      return byEmail;
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: displayName || email.split('@')[0],
        passwordHash: null,
        emailVerifiedAt: new Date(),
        oauthAccounts: {
          create: { provider: 'google', providerUserId },
        },
      },
    });
    return user;
  }
}
