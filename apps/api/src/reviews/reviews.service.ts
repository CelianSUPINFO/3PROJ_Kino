import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async listForWork(tmdbId: number, mediaType: MediaType) {
    return this.prisma.review.findMany({
      where: { tmdbId, mediaType },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertReview(
    userId: string,
    tmdbId: number,
    mediaType: MediaType,
    rating: number,
    body: string,
    spoiler: boolean,
  ) {
    const review = await this.prisma.review.upsert({
      where: {
        userId_tmdbId_mediaType: { userId, tmdbId, mediaType },
      },
      create: {
        userId,
        tmdbId,
        mediaType,
        rating,
        body,
        spoiler,
      },
      update: { rating, body, spoiler },
    });
    await this.prisma.activity.create({
      data: {
        userId,
        type: 'REVIEWED',
        payload: {
          tmdbId,
          mediaType: mediaType.toString(),
          reviewId: review.id,
        },
      },
    });
    await this.prisma.activity.create({
      data: {
        userId,
        type: 'RATED',
        payload: { tmdbId, mediaType: mediaType.toString(), rating },
      },
    });
    return review;
  }

  async deleteReview(userId: string, reviewId: string) {
    const r = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!r || r.userId !== userId) throw new ForbiddenException();
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { ok: true };
  }

  async toggleLike(userId: string, reviewId: string) {
    const existing = await this.prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });
    if (existing) {
      await this.prisma.reviewLike.delete({
        where: { reviewId_userId: { reviewId, userId } },
      });
      return { liked: false };
    }
    await this.prisma.reviewLike.create({ data: { reviewId, userId } });
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (review && review.userId !== userId) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: review.userId,
          type: 'REVIEW_LIKED',
          payload: { reviewId, by: userId },
        },
      });
      await this.pushIfEnabled(review.userId, notification);
    }
    return { liked: true };
  }

  async addComment(
    userId: string,
    reviewId: string,
    body: string,
    parentId?: string,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException();
    const c = await this.prisma.comment.create({
      data: { reviewId, userId, body, parentId },
    });
    if (review.userId !== userId) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: review.userId,
          type: 'REVIEW_COMMENT',
          payload: { reviewId, commentId: c.id, by: userId },
        },
      });
      await this.pushIfEnabled(review.userId, notification);
    }
    return c;
  }

  private async pushIfEnabled(
    userId: string,
    notification: { id: string; type: string; payload: unknown; read: boolean },
  ) {
    const prefs = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notifyPush: true },
    });
    if (prefs?.notifyPush === false) return;
    this.notificationsGateway.pushToUser(
      userId,
      'notification:new',
      notification,
    );
  }

  async listComments(reviewId: string) {
    return this.prisma.comment.findMany({
      where: { reviewId, parentId: null },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        // replies shallow
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reportReview(reporterId: string, reviewId: string, reason: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException();
    const existing = await this.prisma.report.findFirst({
      where: { reporterId, reviewId },
    });
    if (existing) {
      await this.prisma.report.update({
        where: { id: existing.id },
        data: { reason, status: 'OPEN' },
      });
    } else {
      await this.prisma.report.create({
        data: { reporterId, reviewId, reason },
      });
    }
    return { ok: true };
  }

  async setFeatured(reviewId: string, featured: boolean) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { featured },
    });
  }
}
