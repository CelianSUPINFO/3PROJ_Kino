import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashRefresh(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
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
    return this.issueTokens(user.id, user.email, user.role);
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
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
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
      return byEmail;
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: displayName || email.split('@')[0],
        passwordHash: null,
        oauthAccounts: {
          create: { provider: 'google', providerUserId },
        },
      },
    });
    return user;
  }
}
