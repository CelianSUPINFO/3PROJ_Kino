import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  private async mutualFollow(a: string, b: string) {
    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    if (blocked) return false;
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
    this.gateway.pushToUser(userId, 'message:new', message);
    this.gateway.pushToUser(recipientId, 'message:new', message);
    await this.notifications.createAndDeliver(recipientId, 'NEW_MESSAGE', {
      messageId: message.id,
      senderId: userId,
    });
    return message;
  }

  async remove(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException();
    if (message.senderId !== userId) throw new ForbiddenException();
    await this.prisma.message.delete({ where: { id: messageId } });
    this.gateway.pushToUser(message.recipientId, 'message:deleted', { id: messageId });
    return { ok: true };
  }

  async report(userId: string, messageId: string, reason: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.recipientId !== userId) throw new ForbiddenException();
    await this.prisma.messageReport.upsert({
      where: { reporterId_messageId: { reporterId: userId, messageId } },
      create: { reporterId: userId, messageId, reason },
      update: { reason, status: 'OPEN' },
    });
    return { ok: true };
  }

  async typing(userId: string, recipientId: string, active: boolean) {
    if (!(await this.mutualFollow(userId, recipientId))) throw new ForbiddenException();
    this.gateway.pushToUser(recipientId, 'message:typing', { senderId: userId, active });
    return { ok: true };
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
    const candidateIds = [...ids];
    const inboundRows = candidateIds.length
      ? await this.prisma.follow.findMany({
          where: { followerId: { in: candidateIds }, followingId: userId },
          select: { followerId: true },
        })
      : [];
    const outboundRows = candidateIds.length
      ? await this.prisma.follow.findMany({
          where: { followerId: userId, followingId: { in: candidateIds } },
          select: { followingId: true },
        })
      : [];
    const outboundIds = new Set(outboundRows.map((row) => row.followingId));
    const mutualIds = inboundRows.map((row) => row.followerId).filter((id) => outboundIds.has(id));
    const partners = await this.prisma.user.findMany({
      where: { id: { in: mutualIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const unread = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: { recipientId: userId, readAt: null, senderId: { in: mutualIds } },
      _count: { _all: true },
    });
    const counts = new Map(unread.map((r) => [r.senderId, r._count._all]));
    return partners.map((p) => ({ ...p, unreadCount: counts.get(p.id) ?? 0 }));
  }

  async available(userId: string) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((row) => row.followingId);
    if (followingIds.length === 0) return [];

    const mutual = await this.prisma.follow.findMany({
      where: { followerId: { in: followingIds }, followingId: userId },
      select: { followerId: true },
    });
    const mutualIds = mutual.map((row) => row.followerId);
    if (mutualIds.length === 0) return [];

    const existing = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: { in: mutualIds } },
          { recipientId: userId, senderId: { in: mutualIds } },
        ],
      },
      select: { senderId: true, recipientId: true },
    });
    const existingIds = new Set(
      existing.map((row) => (row.senderId === userId ? row.recipientId : row.senderId)),
    );

    return this.prisma.user.findMany({
      where: { id: { in: mutualIds.filter((id) => !existingIds.has(id)) } },
      select: { id: true, displayName: true, avatarUrl: true },
      orderBy: { displayName: 'asc' },
    });
  }
}
