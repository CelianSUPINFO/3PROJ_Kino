import { SearchService } from './search.service';

describe('SearchService', () => {
  it('does not truncate member and public-list search to ten results', async () => {
    const userFindMany = jest.fn().mockResolvedValue([]);
    const listFindMany = jest.fn().mockResolvedValue([]);
    const service = new SearchService(
      {
        user: { findMany: userFindMany },
        customList: { findMany: listFindMany },
      } as never,
      { search: jest.fn().mockResolvedValue({ results: [] }) } as never,
    );

    await service.unified('');

    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(listFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
