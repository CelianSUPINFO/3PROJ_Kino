import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        website: true,
        avatarUrl: true,
        bannerUrl: true,
        favoriteFilms: true,
        theme: true,
        locale: true,
        notifyEmail: true,
        notifyPush: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateMe(userId: string, data: UpdateProfileDto) {
    const { favoriteFilms, ...rest } = data;
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(favoriteFilms !== undefined
          ? { favoriteFilms: favoriteFilms as unknown as Prisma.InputJsonValue }
          : {}),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        website: true,
        avatarUrl: true,
        bannerUrl: true,
        favoriteFilms: true,
        theme: true,
        locale: true,
        notifyEmail: true,
        notifyPush: true,
      },
    });
  }

  async publicProfile(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        bio: true,
        website: true,
        avatarUrl: true,
        bannerUrl: true,
        favoriteFilms: true,
        createdAt: true,
      },
    });
    if (!u) throw new NotFoundException();
    return u;
  }

  async followers(id: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followingId: id },
      include: {
        follower: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return rows.map((r) => r.follower);
  }

  async following(id: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: id },
      include: {
        following: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return rows.map((r) => r.following);
  }

  async follow(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new BadRequestException();
    }
    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId: actorId, followingId: targetId },
      },
      create: { followerId: actorId, followingId: targetId },
      update: {},
    });
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, notifyPush: true },
    });
    if (target) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: targetId,
          type: 'NEW_FOLLOWER',
          payload: { followerId: actorId },
        },
      });
      if (target.notifyPush !== false) {
        this.notificationsGateway.pushToUser(
          targetId,
          'notification:new',
          notification,
        );
      }
      await this.prisma.activity.create({
        data: {
          userId: actorId,
          type: 'FOLLOW',
          payload: { targetId },
        },
      });
    }
    return { ok: true };
  }

  async unfollow(actorId: string, targetId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId: actorId, followingId: targetId },
    });
    return { ok: true };
  }

  async exportData(userId: string) {
    const [
      user,
      statuses,
      reviews,
      lists,
      comments,
      reviewLikes,
      reports,
      followers,
      following,
      activities,
      notifications,
      messagesSent,
      messagesReceived,
      swipeDecisions,
      oauthAccounts,
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          bio: true,
          website: true,
          avatarUrl: true,
          role: true,
          theme: true,
          locale: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.userWorkStatus.findMany({ where: { userId } }),
      this.prisma.review.findMany({ where: { userId } }),
      this.prisma.customList.findMany({
        where: { userId },
        include: { items: true },
      }),
      this.prisma.comment.findMany({ where: { userId } }),
      this.prisma.reviewLike.findMany({ where: { userId } }),
      this.prisma.report.findMany({ where: { reporterId: userId } }),
      this.prisma.follow.findMany({ where: { followingId: userId } }),
      this.prisma.follow.findMany({ where: { followerId: userId } }),
      this.prisma.activity.findMany({ where: { userId } }),
      this.prisma.notification.findMany({ where: { userId } }),
      this.prisma.message.findMany({ where: { senderId: userId } }),
      this.prisma.message.findMany({ where: { recipientId: userId } }),
      this.prisma.swipeDecision.findMany({ where: { userId } }),
      this.prisma.oAuthAccount.findMany({
        where: { userId },
        select: { provider: true, providerUserId: true },
      }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      user,
      library: { statuses, lists },
      reviews: { written: reviews, likes: reviewLikes, comments, reports },
      social: { followers, following, activities },
      notifications,
      messages: { sent: messagesSent, received: messagesReceived },
      recommendations: { swipeDecisions },
      oauthAccounts,
    };
  }

  async exportCsv(userId: string) {
    const [statuses, reviews, lists, messages, following, notifications] =
      await Promise.all([
        this.prisma.userWorkStatus.findMany({ where: { userId } }),
        this.prisma.review.findMany({ where: { userId } }),
        this.prisma.customList.findMany({ where: { userId } }),
        this.prisma.message.findMany({
          where: { OR: [{ senderId: userId }, { recipientId: userId }] },
        }),
        this.prisma.follow.findMany({ where: { followerId: userId } }),
        this.prisma.notification.findMany({ where: { userId } }),
      ]);

    const cell = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const header = 'kind,id,tmdbId,mediaType,status,rating,body,target,date';
    const statusRows = statuses.map((s) =>
      [
        'status',
        s.id,
        s.tmdbId,
        s.mediaType,
        s.status,
        '',
        '',
        '',
        s.updatedAt.toISOString(),
      ]
        .map(cell)
        .join(','),
    );
    const reviewRows = reviews.map((r) =>
      [
        'review',
        r.id,
        r.tmdbId,
        r.mediaType,
        '',
        r.rating,
        r.body,
        '',
        r.updatedAt.toISOString(),
      ]
        .map(cell)
        .join(','),
    );
    const listRows = lists.map((l) =>
      [
        'list',
        l.id,
        '',
        '',
        l.isPublic ? 'public' : 'private',
        '',
        l.name,
        '',
        l.updatedAt.toISOString(),
      ]
        .map(cell)
        .join(','),
    );
    const messageRows = messages.map((m) =>
      [
        'message',
        m.id,
        '',
        '',
        m.readAt ? 'read' : 'unread',
        '',
        m.body,
        m.senderId === userId ? m.recipientId : m.senderId,
        m.createdAt.toISOString(),
      ]
        .map(cell)
        .join(','),
    );
    const followRows = following.map((f) =>
      [
        'follow',
        `${f.followerId}:${f.followingId}`,
        '',
        '',
        '',
        '',
        '',
        f.followingId,
        f.createdAt.toISOString(),
      ]
        .map(cell)
        .join(','),
    );
    const notificationRows = notifications.map((n) =>
      [
        'notification',
        n.id,
        '',
        '',
        n.read ? 'read' : 'unread',
        '',
        n.type,
        '',
        n.createdAt.toISOString(),
      ]
        .map(cell)
        .join(','),
    );
    return [
      header,
      ...statusRows,
      ...reviewRows,
      ...listRows,
      ...messageRows,
      ...followRows,
      ...notificationRows,
    ].join('\n');
  }

  async deleteMe(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }
}
