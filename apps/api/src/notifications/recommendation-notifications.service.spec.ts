import { MediaType } from '@prisma/client';
import { RecommendationNotificationsService } from './recommendation-notifications.service';

describe('RecommendationNotificationsService', () => {
  const notificationFindFirst = jest.fn();
  const reviewFindMany = jest.fn();
  const listFindMany = jest.fn();
  const statusFindMany = jest.fn();
  const discover = jest.fn();
  const details = jest.fn();
  const deliver = jest.fn();
  const service = new RecommendationNotificationsService(
    {
      notification: { findFirst: notificationFindFirst },
      review: { findMany: reviewFindMany },
      customListItem: { findMany: listFindMany },
      userWorkStatus: { findMany: statusFindMany },
    } as never,
    { discover, getDetails: details } as never,
    { createAndDeliver: deliver } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    notificationFindFirst.mockResolvedValue(null);
    reviewFindMany.mockResolvedValue([
      { tmdbId: 1, mediaType: MediaType.MOVIE, rating: 5 },
    ]);
    listFindMany.mockResolvedValue([]);
    statusFindMany.mockResolvedValue([]);
    details.mockResolvedValue({ data: { genres: [{ id: 18 }] } });
    discover.mockResolvedValue({
      results: [{ id: 2, title: 'Suggestion', poster_path: '/poster.jpg' }],
    });
    deliver.mockResolvedValue({ id: 'notification' });
  });

  it('builds a recommendation from highly rated works', async () => {
    await service.deliverForUser('user', 'fr');

    expect(discover).toHaveBeenCalledWith(
      MediaType.MOVIE,
      1,
      'vote_count.desc',
      undefined,
      18,
      6.5,
      'fr-FR',
    );
    expect(deliver).toHaveBeenCalledWith(
      'user',
      'RECOMMENDATION',
      expect.objectContaining({
        tmdbId: 2,
        title: 'Suggestion',
        message: 'Suggestion pourrait vous intéresser.',
      }),
    );
  });

  it('does not send a duplicate recommendation within six hours', async () => {
    notificationFindFirst.mockResolvedValue({ id: 'recent' });

    await service.deliverForUser('user', 'fr');

    expect(discover).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });
});
