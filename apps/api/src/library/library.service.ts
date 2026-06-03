import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType, WatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async setStatus(
    userId: string,
    tmdbId: number,
    mediaType: MediaType,
    status: WatchStatus,
  ) {
    const row = await this.prisma.userWorkStatus.upsert({
      where: {
        userId_tmdbId_mediaType: { userId, tmdbId, mediaType },
      },
      create: { userId, tmdbId, mediaType, status },
      update: { status },
    });
    await this.prisma.activity.create({
      data: {
        userId,
        type: 'STATUS_CHANGED',
        payload: { tmdbId, mediaType: mediaType.toString(), status },
      },
    });
    return row;
  }

  async removeStatus(userId: string, tmdbId: number, mediaType: MediaType) {
    await this.prisma.userWorkStatus.deleteMany({
      where: { userId, tmdbId, mediaType },
    });
    return { ok: true };
  }

  async listByUser(userId: string, status?: WatchStatus) {
    const rows = await this.prisma.userWorkStatus.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const cached = await this.prisma.cachedWork.findUnique({
          where: {
            tmdbId_mediaType: { tmdbId: row.tmdbId, mediaType: row.mediaType },
          },
          select: { title: true, posterPath: true },
        });
        return {
          ...row,
          title: cached?.title ?? `Œuvre #${row.tmdbId}`,
          posterPath: cached?.posterPath ?? null,
        };
      }),
    );
    return enriched;
  }

  async stats(userId: string) {
    const grouped = await this.prisma.userWorkStatus.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });
    const byStatus = Object.fromEntries(
      grouped.map((g) => [g.status, g._count]),
    );
    const completed = await this.prisma.userWorkStatus.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { tmdbId: true, mediaType: true },
    });
    let estimatedMinutesWatched = 0;
    for (const row of completed) {
      const cached = await this.prisma.cachedWork.findUnique({
        where: {
          tmdbId_mediaType: { tmdbId: row.tmdbId, mediaType: row.mediaType },
        },
        select: { runtime: true },
      });
      estimatedMinutesWatched += cached?.runtime ?? 90;
    }
    const total =
      (byStatus.WATCHLIST ?? 0) +
      (byStatus.IN_PROGRESS ?? 0) +
      (byStatus.COMPLETED ?? 0) +
      (byStatus.DROPPED ?? 0);
    return {
      byStatus,
      total,
      completed: byStatus.COMPLETED ?? 0,
      estimatedMinutesWatched,
      estimatedHoursWatched: Math.round(estimatedMinutesWatched / 60),
    };
  }

  async createList(userId: string, name: string, isPublic: boolean, description = '', coverUrl?: string) {
    return this.prisma.customList.create({
      data: { userId, name, isPublic, description, coverUrl },
    });
  }

  async updateList(
    userId: string,
    listId: string,
    data: { name?: string; isPublic?: boolean; description?: string; coverUrl?: string },
  ) {
    const list = await this.prisma.customList.findUnique({
      where: { id: listId },
    });
    if (!list || list.userId !== userId) throw new NotFoundException();
    return this.prisma.customList.update({
      where: { id: listId },
      data,
    });
  }

  async deleteList(userId: string, listId: string) {
    const list = await this.prisma.customList.findUnique({
      where: { id: listId },
    });
    if (!list || list.userId !== userId) throw new NotFoundException();
    await this.prisma.customList.delete({ where: { id: listId } });
    return { ok: true };
  }

  async addToList(
    userId: string,
    listId: string,
    tmdbId: number,
    mediaType: MediaType,
  ) {
    const list = await this.prisma.customList.findUnique({
      where: { id: listId },
    });
    if (!list || list.userId !== userId) throw new NotFoundException();
    const item = await this.prisma.customListItem.upsert({
      where: {
        listId_tmdbId_mediaType: { listId, tmdbId, mediaType },
      },
      create: {
        listId,
        tmdbId,
        mediaType,
        position: await this.prisma.customListItem.count({ where: { listId } }),
      },
      update: {},
    });
    await this.prisma.activity.create({
      data: {
        userId,
        type: 'LIST_ADDED',
        payload: { listId, tmdbId, mediaType: mediaType.toString() },
      },
    });
    return item;
  }

  async reorderList(userId: string, listId: string, itemIds: string[]) {
    const list = await this.prisma.customList.findUnique({ where: { id: listId } });
    if (!list || list.userId !== userId) throw new NotFoundException();
    await this.prisma.$transaction(
      itemIds.map((id, position) =>
        this.prisma.customListItem.updateMany({
          where: { id, listId },
          data: { position },
        }),
      ),
    );
    return { ok: true };
  }

  async removeFromList(
    userId: string,
    listId: string,
    tmdbId: number,
    mediaType: MediaType,
  ) {
    const list = await this.prisma.customList.findUnique({
      where: { id: listId },
    });
    if (!list || list.userId !== userId) throw new NotFoundException();
    await this.prisma.customListItem.deleteMany({
      where: { listId, tmdbId, mediaType },
    });
    return { ok: true };
  }

  async myLists(userId: string) {
    return this.prisma.customList.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
    });
  }

  async getListPublic(listId: string, viewerId?: string) {
    const list = await this.prisma.customList.findUnique({
      where: { id: listId },
      include: { items: { orderBy: [{ position: 'asc' }, { addedAt: 'asc' }] } },
    });
    if (!list) throw new NotFoundException();
    if (!list.isPublic && list.userId !== viewerId) {
      throw new ForbiddenException();
    }
    return list;
  }
}
