import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async mutualFollow(a: string, b: string) {
    const [ab, ba] = await Promise.all([
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: a, followingId: b },
        },
      }),
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: b, followingId: a },
        },
      }),
    ]);
    return !!ab && !!ba;
  }

  async thread(userId: string, otherId: string) {
    if (!(await this.mutualFollow(userId, otherId))) {
      throw new ForbiddenException('Abonnement mutuel requis');
    }
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherId },
          { senderId: otherId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async send(userId: string, recipientId: string, body: string) {
    if (!(await this.mutualFollow(userId, recipientId))) {
      throw new ForbiddenException('Abonnement mutuel requis');
    }
    return this.prisma.message.create({
      data: { senderId: userId, recipientId, body },
    });
  }

  async partners(userId: string) {
    const sent = await this.prisma.message.findMany({
      where: { senderId: userId },
      distinct: ['recipientId'],
      select: { recipientId: true },
    });
    const recv = await this.prisma.message.findMany({
      where: { recipientId: userId },
      distinct: ['senderId'],
      select: { senderId: true },
    });
    const ids = new Set([
      ...sent.map((s) => s.recipientId),
      ...recv.map((r) => r.senderId),
    ]);
    return [...ids];
  }
}
