import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
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

  async updateReview(
    userId: string,
    reviewId: string,
    rating: number,
    body: string,
    spoiler: boolean,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException();
    if (review.userId !== userId) throw new ForbiddenException();
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { rating, body, spoiler },
    });
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
      await this.notifications.createAndDeliver(review.userId, 'REVIEW_LIKED', {
        reviewId,
        tmdbId: review.tmdbId,
        mediaType: review.mediaType,
        by: userId,
      });
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
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { reviewId: true },
      });
      if (!parent || parent.reviewId !== reviewId) {
        throw new NotFoundException();
      }
    }
    const c = await this.prisma.comment.create({
      data: { reviewId, userId, body, parentId },
    });
    if (review.userId !== userId) {
      await this.notifications.createAndDeliver(review.userId, 'REVIEW_COMMENT', {
        reviewId,
        commentId: c.id,
        tmdbId: review.tmdbId,
        mediaType: review.mediaType,
        by: userId,
      });
    }
    return c;
  }

  async listComments(reviewId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { reviewId },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    type CommentNode = (typeof comments)[number] & { replies: CommentNode[] };
    const nodes = new Map<string, CommentNode>(
      comments.map((comment) => [comment.id, { ...comment, replies: [] }]),
    );
    const roots: CommentNode[] = [];
    for (const comment of nodes.values()) {
      const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
      if (parent) {
        parent.replies.push(comment);
      } else {
        roots.push(comment);
      }
    }
    return roots;
  }

  async deleteComment(userId: string, role: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();
    if (comment.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { ok: true };
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
