import { EngagementService } from './engagement.service';

describe('EngagementService', () => {
  it('returns guest defaults', async () => {
    const service = new EngagementService({} as never);
    const result = await service.summary(undefined);
    expect(result.authenticated).toBe(false);
    expect(result.streakDays).toBe(0);
  });

  it('computes weekly counters and a current streak', async () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const service = new EngagementService({
      review: { count: jest.fn().mockResolvedValue(2) },
      userWorkStatus: { count: jest.fn().mockResolvedValue(3) },
      activity: { findMany: jest.fn().mockResolvedValue([{ createdAt: today }, { createdAt: yesterday }]) },
    } as never);
    const result = await service.summary({ sub: 'user' } as never);
    expect(result.authenticated).toBe(true);
    expect(result.weekly).toEqual(expect.objectContaining({ reviews: 2, completed: 3 }));
    expect(result.streakDays).toBe(2);
  });
});
