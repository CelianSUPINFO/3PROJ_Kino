import { Injectable } from '@nestjs/common';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class EngagementService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: JwtUser | undefined) {
    if (!user?.sub) {
      return {
        authenticated: false,
        weekly: {
          reviews: 0,
          completed: 0,
          targetReviews: 3,
          targetCompleted: 5,
        },
        streakDays: 0,
        recommendationRefreshAt: this.nextRefreshIso(),
      };
    }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [weeklyReviews, weeklyCompleted, recentActivities] =
      await Promise.all([
        this.prisma.review.count({
          where: { userId: user.sub, updatedAt: { gte: weekAgo } },
        }),
        this.prisma.userWorkStatus.count({
          where: {
            userId: user.sub,
            status: 'COMPLETED',
            updatedAt: { gte: weekAgo },
          },
        }),
        this.prisma.activity.findMany({
          where: { userId: user.sub },
          orderBy: { createdAt: 'desc' },
          take: 45,
          select: { createdAt: true },
        }),
      ]);

    const streakDays = this.computeStreak(
      recentActivities.map((x) => x.createdAt),
    );

    return {
      authenticated: true,
      weekly: {
        reviews: weeklyReviews,
        completed: weeklyCompleted,
        targetReviews: 3,
        targetCompleted: 5,
      },
      streakDays,
      recommendationRefreshAt: this.nextRefreshIso(),
    };
  }

  private computeStreak(dates: Date[]) {
    if (dates.length === 0) return 0;
    const uniqueDays = new Set(dates.map((d) => startOfDay(d).toISOString()));
    let streak = 0;
    const cursor = startOfDay(new Date());
    while (uniqueDays.has(cursor.toISOString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  private nextRefreshIso() {
    const next = new Date();
    next.setHours(24, 0, 0, 0);
    return next.toISOString();
  }
}
