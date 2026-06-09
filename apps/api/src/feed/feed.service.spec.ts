import { FeedService } from './feed.service';

describe('FeedService', () => {
  it('returns an empty feed without followed users', async () => {
    const service = new FeedService({ follow: { findMany: jest.fn().mockResolvedValue([]) } } as never, {} as never);
    await expect(service.forUser('user')).resolves.toEqual({ items: [], nextCursor: null });
  });

  it('enriches activities and creates a cursor', async () => {
    const activities = [
      { id: 'a', payload: { tmdbId: 1, mediaType: 'MOVIE' }, createdAt: new Date(), user: {} },
      { id: 'b', payload: { text: 'follow' }, createdAt: new Date(), user: {} },
      { id: 'c', payload: { tmdbId: 2, mediaType: 'TV' }, createdAt: new Date(), user: {} },
    ];
    const service = new FeedService({
      follow: { findMany: jest.fn().mockResolvedValue([{ followingId: 'friend' }]) },
      activity: { findMany: jest.fn().mockResolvedValue(activities) },
    } as never, {
      resolveTitles: jest.fn().mockResolvedValue({ 'MOVIE:1': 'Film' }),
    } as never);
    const result = await service.forUser('user', undefined, 2);
    expect(result.nextCursor).toBe('b');
    expect((result.items[0].payload as { title: string }).title).toBe('Film');
  });
});
