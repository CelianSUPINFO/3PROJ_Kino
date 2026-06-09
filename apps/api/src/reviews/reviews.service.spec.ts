import { ReviewsService } from './reviews.service';

describe('ReviewsService comments', () => {
  it('returns nested comment threads', async () => {
    const prisma = {
      comment: {
        findMany: jest.fn(async () => [
          {
            id: 'root',
            reviewId: 'review',
            parentId: null,
            body: 'Root',
            userId: 'u1',
            createdAt: new Date(),
            user: { id: 'u1', displayName: 'One', avatarUrl: null },
          },
          {
            id: 'reply',
            reviewId: 'review',
            parentId: 'root',
            body: 'Reply',
            userId: 'u2',
            createdAt: new Date(),
            user: { id: 'u2', displayName: 'Two', avatarUrl: null },
          },
        ]),
      },
    };
    const service = new ReviewsService(
      prisma as never,
      {} as never,
    );

    const result = await service.listComments('review');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('root');
    expect(result[0].replies[0].id).toBe('reply');
  });

  it('updates only a review owned by the current user', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'review', rating: 5 });
    const prisma = {
      review: {
        findUnique: jest.fn().mockResolvedValue({ id: 'review', userId: 'owner' }),
        update,
      },
    };
    const service = new ReviewsService(prisma as never, {} as never);

    await service.updateReview('owner', 'review', 5, 'Updated', false);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'review' },
      data: { rating: 5, body: 'Updated', spoiler: false },
    });
  });

  it('rejects editing another user review', async () => {
    const prisma = {
      review: {
        findUnique: jest.fn().mockResolvedValue({ id: 'review', userId: 'owner' }),
      },
    };
    const service = new ReviewsService(prisma as never, {} as never);

    await expect(
      service.updateReview('other', 'review', 5, 'Updated', false),
    ).rejects.toThrow('Forbidden');
  });
});
