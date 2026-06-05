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
});
