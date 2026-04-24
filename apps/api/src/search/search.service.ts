import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../media/tmdb.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
  ) {}

  async unified(
    q: string,
    page = 1,
    year?: number,
    genreId?: number,
    minVote?: number,
    mediaType?: 'movie' | 'tv',
  ) {
    const [users, lists, tmdb] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          displayName: { contains: q, mode: 'insensitive' },
        },
        take: 10,
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      }),
      this.prisma.customList.findMany({
        where: { isPublic: true, name: { contains: q, mode: 'insensitive' } },
        take: 10,
        include: {
          user: { select: { id: true, displayName: true } },
        },
      }),
      this.tmdb.search(q, page, year, genreId, minVote, mediaType),
    ]);
    return { users, lists, works: tmdb };
  }
}
