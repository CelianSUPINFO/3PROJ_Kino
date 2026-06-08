import { UsersService } from './users.service';

describe('UsersService profile lists visibility', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const resolveCards = jest.fn();
  const service = new UsersService(
    { customList: { findMany }, user: { findUnique } } as never,
    {} as never,
    {} as never,
    { resolveCards } as never,
  );

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
    findUnique.mockReset();
    findUnique.mockResolvedValue({ id: 'owner-id', displayName: 'Owner' });
    resolveCards.mockReset();
    resolveCards.mockResolvedValue({});
  });

  it('returns private and public lists to the owner', async () => {
    await service.profileLists('owner-id', 'owner-id');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner-id' } }),
    );
  });

  it('returns only public lists to other visitors', async () => {
    await service.profileLists('owner-id', 'visitor-id');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'owner-id', isPublic: true },
      }),
    );
  });

  it('includes only visible lists directly in a public profile', async () => {
    findMany.mockResolvedValue([{ id: 'public-list', isPublic: true }]);

    const profile = await service.publicProfile('owner-id', 'visitor-id');

    expect(profile.lists).toEqual([{ id: 'public-list', isPublic: true }]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'owner-id', isPublic: true },
      }),
    );
  });
});
