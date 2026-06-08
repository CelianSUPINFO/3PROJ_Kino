import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaType, Prisma } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TmdbService } from '../media/tmdb.service';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly tmdb: TmdbService,
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
        notifyPush: true,
        notifyEmail: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateMe(userId: string, data: UpdateProfileDto) {
    const { favoriteFilms, ...rest } = data;
    if (favoriteFilms) {
      const movies = favoriteFilms.filter((item) => item.mediaType === 'MOVIE');
      const series = favoriteFilms.filter((item) => item.mediaType === 'TV');
      if (movies.length > 5 || series.length > 5) {
        throw new BadRequestException('Maximum 5 films et 5 séries favoris');
      }
    }
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
        notifyPush: true,
        notifyEmail: true,
      },
    });
  }

  async uploadProfileImage(
    userId: string,
    kind: 'avatar' | 'banner',
    file?: Express.Multer.File,
  ) {
    if (kind !== 'avatar' && kind !== 'banner') {
      throw new BadRequestException('Type d’image invalide');
    }
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Le fichier doit être une image');
    }

    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Cloudinary n’est pas configuré');
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const folder = `kino/profiles/${userId}`;
    const publicId = `${kind}-${Date.now()}`;
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
          overwrite: true,
          transformation:
            kind === 'avatar'
              ? [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }]
              : [{ width: 1600, height: 600, crop: 'fill' }],
        },
        (error, uploadResult) => {
          if (error || !uploadResult?.secure_url) {
            reject(error ?? new Error('Upload Cloudinary impossible'));
            return;
          }
          resolve({ secure_url: uploadResult.secure_url });
        },
      );
      upload.end(file.buffer);
    });

    const field = kind === 'avatar' ? 'avatarUrl' : 'bannerUrl';
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { [field]: result.secure_url },
      select: {
        id: true,
        displayName: true,
        bio: true,
        website: true,
        avatarUrl: true,
        bannerUrl: true,
        favoriteFilms: true,
      },
    });
    return { url: result.secure_url, user: updated };
  }

  async publicProfile(id: string, viewerId?: string) {
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
    const favorites = Array.isArray(u.favoriteFilms)
      ? (u.favoriteFilms as Array<{
          tmdbId: number;
          mediaType: MediaType;
          title?: string;
          posterPath?: string | null;
        }>)
      : [];
    const cards = await this.tmdb.resolveCards(
      favorites.map((favorite) => ({
        tmdbId: favorite.tmdbId,
        mediaType: favorite.mediaType,
      })),
    );
    return {
      ...u,
      favoriteFilms: favorites.map((favorite) => ({
        ...favorite,
        ...cards[`${favorite.mediaType}:${favorite.tmdbId}`],
      })),
      lists: await this.profileLists(id, viewerId),
    };
  }

  async profileLists(profileId: string, viewerId?: string) {
    return this.prisma.customList.findMany({
      where: {
        userId: profileId,
        ...(viewerId === profileId ? {} : { isPublic: true }),
      },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
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

  async reviews(id: string) {
    const reviews = await this.prisma.review.findMany({
      where: { userId: id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { likes: true, comments: true } } },
    });
    const cards = await this.tmdb.resolveCards(
      reviews.map((review) => ({
        tmdbId: review.tmdbId,
        mediaType: review.mediaType,
      })),
    );
    return reviews.map((review) => ({
      ...review,
      title:
        cards[`${review.mediaType}:${review.tmdbId}`]?.title ??
        `#${review.tmdbId}`,
      posterPath:
        cards[`${review.mediaType}:${review.tmdbId}`]?.posterPath ?? null,
    }));
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
      await this.notifications.createAndDeliver(targetId, 'NEW_FOLLOWER', {
        followerId: actorId,
      });
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

  async blocks(userId: string) {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => row.blocked);
  }

  async block(userId: string, targetId: string) {
    if (userId === targetId) throw new BadRequestException();
    await this.prisma.$transaction([
      this.prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
        create: { blockerId: userId, blockedId: targetId },
        update: {},
      }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: targetId },
            { followerId: targetId, followingId: userId },
          ],
        },
      }),
    ]);
    return { ok: true };
  }

  async unblock(userId: string, targetId: string) {
    await this.prisma.userBlock.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
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
