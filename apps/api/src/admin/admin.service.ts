import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async reports() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        review: true,
        reporter: { select: { id: true, displayName: true } },
      },
    });
  }

  async stats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const activeSince = new Date(now.getTime() - 5 * 60000);
    const [
      users,
      activeUsers,
      reviews,
      reportsOpen,
      weeklyReviews,
      topFollowed,
      topReviewers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastSeenAt: { gte: activeSince } } }),
      this.prisma.review.count(),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
      this.prisma.review.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { tmdbId: true, mediaType: true, rating: true },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { followers: { _count: 'desc' } },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          _count: { select: { followers: true } },
        },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { reviewsWritten: { _count: 'desc' } },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          _count: { select: { reviewsWritten: true } },
        },
      }),
    ]);

    const works = new Map<string, { tmdbId: number; mediaType: string; count: number; total: number }>();
    for (const review of weeklyReviews) {
      const key = `${review.mediaType}:${review.tmdbId}`;
      const row = works.get(key) ?? {
        tmdbId: review.tmdbId,
        mediaType: review.mediaType,
        count: 0,
        total: 0,
      };
      row.count += 1;
      row.total += review.rating;
      works.set(key, row);
    }
    const workRows = [...works.values()];
    const cached = await this.prisma.cachedWork.findMany({
      where: {
        OR: workRows.map((work) => ({
          tmdbId: work.tmdbId,
          mediaType: work.mediaType as 'MOVIE' | 'TV',
        })),
      },
      select: { tmdbId: true, mediaType: true, title: true },
    });
    const titleFor = (work: { tmdbId: number; mediaType: string }) =>
      cached.find((item) => item.tmdbId === work.tmdbId && item.mediaType === work.mediaType)?.title ??
      `${work.mediaType === 'TV' ? 'Série' : 'Film'} #${work.tmdbId}`;
    const toWork = (work: (typeof workRows)[number]) => ({
      ...work,
      title: titleFor(work),
      average: Number((work.total / work.count).toFixed(2)),
    });

    return {
      totals: {
        users,
        activeUsers,
        reviews,
        reportsOpen,
        averageReviewsPerUser: users ? Number((reviews / users).toFixed(2)) : 0,
      },
      topReviewedThisWeek: workRows
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(toWork),
      topRatedThisWeek: workRows
        .filter((work) => work.count > 0)
        .sort((a, b) => b.total / b.count - a.total / a.count)
        .slice(0, 5)
        .map(toWork),
      topFollowed,
      topReviewers,
    };
  }

  async users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        bannedUntil: true,
        lastSeenAt: true,
        createdAt: true,
        _count: { select: { reviewsWritten: true, followers: true, reportsFiled: true } },
      },
    });
  }

  async updateUser(userId: string, data: { role?: 'USER' | 'ADMIN'; bannedUntil?: string | null }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.role ? { role: data.role } : {}),
        ...(data.bannedUntil !== undefined
          ? { bannedUntil: data.bannedUntil ? new Date(data.bannedUntil) : null }
          : {}),
      },
      select: { id: true, role: true, bannedUntil: true },
    });
  }

  async deleteUser(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  async resolveReport(id: string, status: ReportStatus) {
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.prisma.report.update({
      where: { id },
      data: { status },
    });
  }

  async messageReports() {
    return this.prisma.messageReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, displayName: true, avatarUrl: true } },
        message: {
          include: {
            sender: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async resolveMessageReport(id: string, status: ReportStatus) {
    const report = await this.prisma.messageReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException();
    return this.prisma.messageReport.update({
      where: { id },
      data: { status },
    });
  }

  async deleteMessage(messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException();
    await this.prisma.message.delete({ where: { id: messageId } });
    return { ok: true };
  }

  async banUser(userId: string, until: Date | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { bannedUntil: until },
    });
  }

  async deleteReview(reviewId: string) {
    const r = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!r) throw new NotFoundException();
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { ok: true };
  }

  async listReviews(limit = 50) {
    return this.prisma.review.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }
}
