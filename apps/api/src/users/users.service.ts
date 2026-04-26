import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        website: true,
        avatarUrl: true,
        theme: true,
        locale: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateMe(
    userId: string,
    data: Partial<{
      displayName: string;
      bio: string;
      website: string;
      avatarUrl: string;
      theme: string;
      locale: string;
    }>,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        website: true,
        avatarUrl: true,
        theme: true,
        locale: true,
      },
    });
  }

  async publicProfile(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        bio: true,
        website: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!u) throw new NotFoundException();
    return u;
  }

  async followers(id: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followingId: id },
      include: {
        follower: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return rows.map((r) => r.follower);
  }

  async following(id: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: id },
      include: {
        following: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return rows.map((r) => r.following);
  }

  async follow(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new BadRequestException();
    }
    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId: actorId, followingId: targetId },
      },
      create: { followerId: actorId, followingId: targetId },
      update: {},
    });
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (target) {
      await this.prisma.notification.create({
        data: {
          userId: targetId,
          type: 'NEW_FOLLOWER',
          payload: { followerId: actorId },
        },
      });
      await this.prisma.activity.create({
        data: {
          userId: actorId,
          type: 'FOLLOW',
          payload: { targetId },
        },
      });
    }
    return { ok: true };
  }

  async unfollow(actorId: string, targetId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId: actorId, followingId: targetId },
    });
    return { ok: true };
  }

  async exportData(userId: string) {
    const [statuses, reviews, lists] = await Promise.all([
      this.prisma.userWorkStatus.findMany({ where: { userId } }),
      this.prisma.review.findMany({ where: { userId } }),
      this.prisma.customList.findMany({
        where: { userId },
        include: { items: true },
      }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      statuses,
      reviews,
      lists,
    };
  }
}
