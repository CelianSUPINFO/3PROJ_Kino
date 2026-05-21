import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

type NotificationPayload = Record<string, unknown>;

const labels: Record<string, string> = {
  NEW_FOLLOWER: 'Vous avez un nouvel abonné.',
  REVIEW_LIKED: 'Votre critique a reçu une nouvelle mention J’aime.',
  REVIEW_COMMENT: 'Votre critique a reçu un nouveau commentaire.',
  NEW_MESSAGE: 'Vous avez reçu un nouveau message.',
  RECOMMENDATION: 'Une nouvelle recommandation Kino vous attend.',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createAndDeliver(userId: string, type: string, payload: NotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonValue },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notifyPush: true },
    });
    if (!user) return notification;
    this.gateway.pushToUser(userId, 'notification:new', notification);
    if (user.notifyPush) {
      void this.sendExpoPush(userId, type, payload);
    }
    return notification;
  }

  async registerPushToken(userId: string, token: string, platform: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { token, platform, userId },
      update: { platform, userId },
    });
  }

  async removePushToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { ok: true };
  }

  private async sendExpoPush(userId: string, type: string, payload: NotificationPayload) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    if (!tokens.length) return;
    try {
      await axios.post(
        'https://exp.host/--/api/v2/push/send',
        tokens.map(({ token }) => ({
          to: token,
          sound: 'default',
          title: 'Kino',
          body: labels[type] ?? 'Vous avez une nouvelle notification.',
          data: { type, ...payload },
        })),
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
      );
    } catch (error) {
      this.logger.warn(`Expo push failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

}
