import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async mutualFollow(a: string, b: string) {
    const [ab, ba] = await Promise.all([
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: a, followingId: b },
        },
      }),
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: b, followingId: a },
        },
      }),
    ]);
    return !!ab && !!ba;
  }

  async thread(userId: string, otherId: string) {
    if (!(await this.mutualFollow(userId, otherId))) {
      throw new ForbiddenException('Abonnement mutuel requis');
    }
    await this.prisma.message.updateMany({
      where: { senderId: otherId, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherId },
          { senderId: otherId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async send(userId: string, recipientId: string, body: string) {
    if (!(await this.mutualFollow(userId, recipientId))) {
      throw new ForbiddenException('Abonnement mutuel requis');
    }
    const message = await this.prisma.message.create({
      data: { senderId: userId, recipientId, body },
    });
    await this.notifications.createAndDeliver(recipientId, 'NEW_MESSAGE', {
      messageId: message.id,
      senderId: userId,
    });
    return message;
  }

  async partners(userId: string) {
    const sent = await this.prisma.message.findMany({
      where: { senderId: userId },
      distinct: ['recipientId'],
      select: { recipientId: true },
    });
    const recv = await this.prisma.message.findMany({
      where: { recipientId: userId },
      distinct: ['senderId'],
      select: { senderId: true },
    });
    const ids = new Set([
      ...sent.map((s) => s.recipientId),
      ...recv.map((r) => r.senderId),
    ]);
    const partners = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const unread = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: { recipientId: userId, readAt: null, senderId: { in: [...ids] } },
      _count: { _all: true },
    });
    const counts = new Map(unread.map((r) => [r.senderId, r._count._all]));
    return partners.map((p) => ({ ...p, unreadCount: counts.get(p.id) ?? 0 }));
  }
}
