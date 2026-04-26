import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string, cursor?: string, take = 20) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const ids = following.map((f) => f.followingId);
    if (ids.length === 0) return { items: [], nextCursor: null };
    const activities = await this.prisma.activity.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });
    let next: string | null = null;
    if (activities.length > take) {
      activities.pop();
      next = activities[activities.length - 1]?.id ?? null;
    }
    return { items: activities, nextCursor: next };
  }
}
