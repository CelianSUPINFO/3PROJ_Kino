import { UsersService } from './users.service';

describe('UsersService profile lists visibility', () => {
  const findMany = jest.fn();
  const service = new UsersService(
    { customList: { findMany } } as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
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
});
