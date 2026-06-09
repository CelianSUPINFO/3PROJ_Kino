import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LibraryService } from './library.service';

describe('LibraryService list privacy', () => {
  const findUnique = jest.fn();
  const service = new LibraryService({
    customList: { findUnique },
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('allows anyone to read a public list', async () => {
    findUnique.mockResolvedValue({ id: 'list', userId: 'owner', isPublic: true });

    await expect(service.getListPublic('list', 'visitor')).resolves.toMatchObject({
      id: 'list',
    });
  });

  it('allows only the owner to read a private list', async () => {
    findUnique.mockResolvedValue({ id: 'list', userId: 'owner', isPublic: false });

    await expect(service.getListPublic('list', 'visitor')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.getListPublic('list', 'owner')).resolves.toMatchObject({
      id: 'list',
    });
  });

  it('prevents another user from updating a list', async () => {
    findUnique.mockResolvedValue({ id: 'list', userId: 'owner' });

    await expect(
      service.updateList('visitor', 'list', { name: 'Changed' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
