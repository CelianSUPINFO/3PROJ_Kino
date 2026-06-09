import { MediaType } from '@prisma/client';
import { HomeService } from './home.service';

describe('HomeService', () => {
  it('aggregates public and personalized home sections', async () => {
    const discover = jest.fn()
      .mockResolvedValueOnce({ results: Array.from({ length: 20 }, (_, id) => ({ id })) })
      .mockResolvedValueOnce({ results: [{ id: 2 }] })
      .mockResolvedValueOnce({ results: [{ id: 3 }] })
      .mockResolvedValueOnce({ results: [{ id: 4 }] })
      .mockResolvedValueOnce({ results: [{ id: 5 }] });
    const service = new HomeService({
      discover,
      resolveTitles: jest.fn().mockResolvedValue({ 'MOVIE:1': 'Cached title' }),
    } as never, {
      review: { findMany: jest.fn().mockResolvedValue([{ tmdbId: 1, mediaType: MediaType.MOVIE }]) },
      userWorkStatus: { findMany: jest.fn().mockResolvedValue([]) },
    } as never);
    const result = await service.getHome({ sub: 'user' } as never, 'en-US');
    expect(result.trending.movies).toHaveLength(14);
    expect(result.latestRatings[0].title).toBe('Cached title');
    expect(result.categories).toHaveLength(3);
  });
});
