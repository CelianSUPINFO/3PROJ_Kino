import { Injectable } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { TmdbService } from '../media/tmdb.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeService {
  constructor(
    private readonly tmdb: TmdbService,
    private readonly prisma: PrismaService,
  ) {}

  async getHome(user: JwtUser | undefined) {
    const [trending, topTv, latestRatings, recentWatched] = await Promise.all([
      this.tmdb.discover(
        MediaType.MOVIE,
        1,
        'popularity.desc',
        undefined,
        undefined,
        6.2,
      ),
      this.tmdb.discover(
        MediaType.TV,
        1,
        'popularity.desc',
        undefined,
        undefined,
        6.2,
      ),
      this.prisma.review.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      user?.sub
        ? this.prisma.userWorkStatus.findMany({
            where: { userId: user.sub },
            orderBy: { updatedAt: 'desc' },
            take: 8,
          })
        : Promise.resolve([]),
    ]);

    const categories = await Promise.all([
      this.tmdb.discover(
        MediaType.MOVIE,
        1,
        'vote_average.desc',
        undefined,
        undefined,
        7.2,
      ),
      this.tmdb.discover(
        MediaType.MOVIE,
        1,
        'release_date.desc',
        undefined,
        undefined,
        6.0,
      ),
      this.tmdb.discover(
        MediaType.TV,
        1,
        'vote_average.desc',
        undefined,
        undefined,
        7.0,
      ),
    ]);

    const titleMap = await this.tmdb.resolveTitles([
      ...latestRatings.map((r) => ({
        tmdbId: r.tmdbId,
        mediaType: r.mediaType,
      })),
      ...recentWatched.map((w) => ({
        tmdbId: w.tmdbId,
        mediaType: w.mediaType,
      })),
    ]);

    const key = (tmdbId: number, mediaType: MediaType) =>
      `${mediaType}:${tmdbId}`;

    return {
      trending: {
        movies: (trending.results ?? []).slice(0, 14),
        tv: (topTv.results ?? []).slice(0, 14),
      },
      latestRatings: latestRatings.map((r) => ({
        ...r,
        title: titleMap[key(r.tmdbId, r.mediaType)] ?? `Film #${r.tmdbId}`,
      })),
      recentWatched: recentWatched.map((w) => ({
        ...w,
        title: titleMap[key(w.tmdbId, w.mediaType)] ?? `Film #${w.tmdbId}`,
      })),
      categories: [
        {
          id: 'top-rated-movies',
          label: 'Top rated movies',
          items: (categories[0].results ?? []).slice(0, 14),
          type: 'movie',
        },
        {
          id: 'new-releases',
          label: 'Fresh releases',
          items: (categories[1].results ?? []).slice(0, 14),
          type: 'movie',
        },
        {
          id: 'top-rated-tv',
          label: 'Top rated series',
          items: (categories[2].results ?? []).slice(0, 14),
          type: 'tv',
        },
      ],
    };
  }
}
