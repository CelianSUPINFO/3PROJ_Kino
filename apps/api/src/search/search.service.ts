import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../media/tmdb.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
  ) {}

  async unified(q: string, page = 1) {
    const [users, lists, tmdb] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          displayName: { contains: q, mode: 'insensitive' },
        },
        take: 100,
        orderBy: { displayName: 'asc' },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      }),
      this.prisma.customList.findMany({
        where: { isPublic: true, name: { contains: q, mode: 'insensitive' } },
        take: 100,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, displayName: true } },
        },
      }),
      this.tmdb.search(q, page),
    ]);
    return { users, lists, works: tmdb };
  }
}
