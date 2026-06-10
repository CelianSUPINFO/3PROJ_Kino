import { Injectable } from '@nestjs/common';
import { MediaType, SwipeChoice } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../media/tmdb.service';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
  ) {}

  async tonight(
    user: JwtUser | undefined,
    mediaType: MediaType,
    limit = 20,
    page = 1,
  ) {
    const baseSort = user ? 'vote_count.desc' : 'popularity.desc';
    const discover = await this.tmdb.discover(
      mediaType,
      page,
      baseSort,
      undefined,
      undefined,
      6.2,
    );

    const raw = (discover.results ?? []) as Array<Record<string, unknown>>;
    let personalized = false;
    const preferredGenres = new Set<number>();
    let hiddenTmdbIds = new Set<number>();

    if (user?.sub) {
      const [ratings, swipes] = await Promise.all([
        this.prisma.review.findMany({
          where: { userId: user.sub },
          select: { rating: true, tmdbId: true, mediaType: true },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.swipeDecision.findMany({
          where: { userId: user.sub, mediaType },
          select: { tmdbId: true },
          take: 200,
        }),
      ]);

      hiddenTmdbIds = new Set(swipes.map((s) => s.tmdbId));
      if (ratings.length >= 10) {
        personalized = true;
        const liked = ratings.filter(
          (r) => r.mediaType === mediaType && r.rating >= 4,
        );
        if (liked.length > 0) {
          const likedDetails = await Promise.all(
            liked.slice(0, 10).map(async (r) => {
              try {
                const details = await this.tmdb.getDetails(mediaType, r.tmdbId);
                return (
                  (details.data as { genres?: { id: number }[] }).genres ?? []
                ).map((g) => g.id);
              } catch {
                return [];
              }
            }),
          );
          likedDetails
            .flat()
            .forEach((genreId) => preferredGenres.add(genreId));

          const detailSamples = raw.filter(
            (r) => !hiddenTmdbIds.has(Number(r.id)),
          );
          const ranked = detailSamples
            .map((r) => ({
              id: Number(r.id),
              score: Number(r.vote_average ?? 0),
              genres: (r.genre_ids as number[] | undefined) ?? [],
              mediaType:
                mediaType === MediaType.MOVIE
                  ? ('movie' as const)
                  : ('tv' as const),
              title: (r.title ?? r.name ?? 'Untitled') as string,
              posterPath: (r.poster_path as string | undefined) ?? null,
              backdropPath: (r.backdrop_path as string | undefined) ?? null,
              overview: (r.overview as string | undefined) ?? '',
            }))
            .map((item) => {
              const boost = item.genres.filter((g) =>
                preferredGenres.has(g),
              ).length;
              return { ...item, score: item.score + boost * 1.2 };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
          const rankedWithGenres = await Promise.all(
            ranked.map(async (movie) => ({
              ...movie,
              genreNames: await this.tmdb.resolveGenres(mediaType, movie.genres),
            })),
          );
          return {
            personalized,
            source: 'ratings',
            results: rankedWithGenres,
          };
        }
      }
    }

    const fallback = raw
      .filter((r) => !hiddenTmdbIds.has(Number(r.id)))
      .slice(0, limit)
      .map((r) => ({
        id: Number(r.id),
        score: Number(r.vote_average ?? 0),
        genres: (r.genre_ids as number[] | undefined) ?? [],
        mediaType:
          mediaType === MediaType.MOVIE ? ('movie' as const) : ('tv' as const),
        title: (r.title ?? r.name ?? 'Untitled') as string,
        posterPath: (r.poster_path as string | undefined) ?? null,
        backdropPath: (r.backdrop_path as string | undefined) ?? null,
        overview: (r.overview as string | undefined) ?? '',
      }));

    const enriched = await Promise.all(
      fallback.map(async (movie) => ({
        ...movie,
        genreNames: await this.tmdb.resolveGenres(mediaType, movie.genres),
      })),
    );

    return {
      personalized,
      source: preferredGenres.size > 0 ? 'ratings' : 'random',
      results: enriched,
    };
  }

  async swipe(
    userId: string,
    tmdbId: number,
    mediaType: MediaType,
    choice: SwipeChoice,
  ) {
    const decision = await this.prisma.swipeDecision.upsert({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
      create: { userId, tmdbId, mediaType, choice },
      update: { choice },
    });
    return { ok: true, decision };
  }
}
