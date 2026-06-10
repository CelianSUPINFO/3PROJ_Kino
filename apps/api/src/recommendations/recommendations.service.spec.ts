import { MediaType, SwipeChoice } from '@prisma/client';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  const raw = [{ id: 2, title: 'Candidate', vote_average: 7, genre_ids: [18] }];

  it('returns popular fallback recommendations for guests', async () => {
    const service = new RecommendationsService({} as never, {
      discover: jest.fn().mockResolvedValue({ results: raw }),
      resolveGenres: jest.fn().mockResolvedValue(['Drama']),
    } as never);
    const result = await service.tonight(undefined, MediaType.MOVIE);
    expect(result.personalized).toBe(false);
    expect(result.results[0]).toEqual(expect.objectContaining({ title: 'Candidate', genreNames: ['Drama'] }));
  });

  it('personalizes and excludes works already swiped', async () => {
    const ratings = Array.from({ length: 10 }, (_, index) => ({
      rating: 5, tmdbId: index + 10, mediaType: MediaType.MOVIE,
    }));
    const service = new RecommendationsService({
      review: { findMany: jest.fn().mockResolvedValue(ratings) },
      swipeDecision: { findMany: jest.fn().mockResolvedValue([{ tmdbId: 99 }]) },
    } as never, {
      discover: jest.fn().mockResolvedValue({ results: [...raw, { id: 99, title: 'Hidden', vote_average: 10 }] }),
      getDetails: jest.fn().mockResolvedValue({ data: { genres: [{ id: 18 }] } }),
      resolveGenres: jest.fn().mockResolvedValue(['Drama']),
    } as never);
    const result = await service.tonight({ sub: 'user' } as never, MediaType.MOVIE);
    expect(result.personalized).toBe(true);
    expect(result.source).toBe('ratings');
    expect(result.results.some((item) => item.id === 99)).toBe(false);
  });

  it('persists swipe decisions', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'decision' });
    const service = new RecommendationsService({ swipeDecision: { upsert } } as never, {} as never);
    const result = await service.swipe('user', 1, MediaType.MOVIE, SwipeChoice.SMASH);
    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalled();
  });
});
