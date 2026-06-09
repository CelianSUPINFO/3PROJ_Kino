import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MediaType } from '@prisma/client';
import { TmdbService } from '../media/tmdb.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

type Work = { tmdbId: number; mediaType: MediaType };
type TmdbResult = {
  id?: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  genre_ids?: number[];
};

@Injectable()
export class RecommendationNotificationsService {
  private readonly logger = new Logger(RecommendationNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 9,18 * * *', { timeZone: 'Europe/Paris' })
  async deliverTwiceDaily() {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [{ bannedUntil: null }, { bannedUntil: { lt: new Date() } }],
      },
      select: { id: true, locale: true },
    });
    for (const user of users) {
      try {
        await this.deliverForUser(user.id, user.locale);
      } catch (error) {
        this.logger.warn(
          `Recommendation failed for ${user.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
  }

  async deliverForUser(userId: string, locale = 'fr') {
    const lastRecommendation = await this.prisma.notification.findFirst({
      where: {
        userId,
        type: 'RECOMMENDATION',
        createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (lastRecommendation) return null;

    const [reviews, lists, statuses] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        select: { tmdbId: true, mediaType: true, rating: true },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.prisma.customListItem.findMany({
        where: { list: { userId } },
        select: { tmdbId: true, mediaType: true },
        orderBy: { addedAt: 'desc' },
        take: 100,
      }),
      this.prisma.userWorkStatus.findMany({
        where: { userId },
        select: { tmdbId: true, mediaType: true },
        take: 300,
      }),
    ]);
    const liked: Work[] = reviews
      .filter((review) => review.rating >= 4)
      .map(({ tmdbId, mediaType }) => ({ tmdbId, mediaType }));
    const seeds = this.uniqueWorks([...liked, ...lists]);
    const excluded = new Set(
      this.uniqueWorks([...reviews, ...lists, ...statuses]).map(
        (work) => `${work.mediaType}:${work.tmdbId}`,
      ),
    );
    const mediaType =
      seeds[0]?.mediaType ?? (new Date().getHours() < 15 ? MediaType.MOVIE : MediaType.TV);
    const language = locale === 'en' ? 'en-US' : 'fr-FR';
    const genres = await this.preferredGenres(seeds.slice(0, 8), language);
    const discovered = await this.tmdb.discover(
      mediaType,
      1,
      'vote_count.desc',
      undefined,
      genres[0],
      6.5,
      language,
    );
    const candidates = (discovered.results ?? []) as TmdbResult[];
    const candidate =
      candidates.find(
        (item) =>
          item.id && !excluded.has(`${mediaType}:${Number(item.id)}`),
      ) ?? candidates[0];
    if (!candidate?.id) return null;

    const title = candidate.title ?? candidate.name ?? (locale === 'en' ? 'This title' : 'Cette oeuvre');
    return this.notifications.createAndDeliver(userId, 'RECOMMENDATION', {
      tmdbId: Number(candidate.id),
      mediaType,
      title,
      posterPath: candidate.poster_path ?? null,
      reason: seeds.length > 0 ? 'profile' : 'popular',
      message:
        locale === 'en'
          ? `${title} might interest you.`
          : `${title} pourrait vous intéresser.`,
    });
  }

  private async preferredGenres(seeds: Work[], language: string) {
    const counts = new Map<number, number>();
    await Promise.all(
      seeds.map(async (seed) => {
        try {
          const details = await this.tmdb.getDetails(seed.mediaType, seed.tmdbId, language);
          const genres = (details.data as { genres?: { id: number }[] }).genres ?? [];
          for (const genre of genres) counts.set(genre.id, (counts.get(genre.id) ?? 0) + 1);
        } catch {
          // A missing TMDB title must not prevent the scheduled batch.
        }
      }),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }

  private uniqueWorks(works: Work[]) {
    return [
      ...new Map(works.map((work) => [`${work.mediaType}:${work.tmdbId}`, work] as const)).values(),
    ];
  }
}
