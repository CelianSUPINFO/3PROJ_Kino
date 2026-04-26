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

  async resolveReport(id: string, status: ReportStatus) {
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.prisma.report.update({
      where: { id },
      data: { status },
    });
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
        user: { select: { id: true, displayName: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }
}
