import { Injectable } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { TmdbService } from '../media/tmdb.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
  ) {}

  async forUser(userId: string, cursor?: string, take = 20) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const ids = following.map((f) => f.followingId);
    if (ids.length === 0) return { items: [], nextCursor: null };
    const activities = await this.prisma.activity.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });
    let next: string | null = null;
    if (activities.length > take) {
      activities.pop();
      next = activities[activities.length - 1]?.id ?? null;
    }

    const works = activities
      .map((a) => a.payload as Record<string, unknown>)
      .filter((p) => typeof p.tmdbId === 'number')
      .map((p) => ({
        tmdbId: p.tmdbId as number,
        mediaType:
          p.mediaType === 'TV' || p.mediaType === MediaType.TV
            ? MediaType.TV
            : MediaType.MOVIE,
      }));
    const titleMap = await this.tmdb.resolveTitles(works);

    const items = activities.map((a) => {
      const payload = a.payload as Record<string, unknown>;
      if (typeof payload.tmdbId !== 'number') return a;
      const mediaType =
        payload.mediaType === 'TV' || payload.mediaType === MediaType.TV
          ? MediaType.TV
          : MediaType.MOVIE;
      const title = titleMap[`${mediaType}:${payload.tmdbId}`];
      if (!title) return a;
      return {
        ...a,
        payload: { ...payload, title },
      };
    });

    return { items, nextCursor: next };
  }
}
