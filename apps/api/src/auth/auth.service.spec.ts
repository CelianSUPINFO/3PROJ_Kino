import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userFindUnique = jest.fn();
  const refreshCreate = jest.fn();
  const jwtSign = jest.fn().mockResolvedValue('access-token');
  const service = new AuthService(
    {
      user: { findUnique: userFindUnique },
      refreshToken: { create: refreshCreate },
    } as never,
    { signAsync: jwtSign } as never,
    {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues access and hashed refresh tokens for valid credentials', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-id',
      email: 'user@kino.test',
      passwordHash: await bcrypt.hash('StrongP4ssword', 4),
      role: Role.USER,
      bannedUntil: null,
    });

    const result = await service.login('user@kino.test', 'StrongP4ssword');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBeDefined();
    expect(refreshCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-id',
        tokenHash: expect.not.stringContaining(result.refreshToken),
      }),
    });
  });

  it('rejects invalid credentials', async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(service.login('missing@kino.test', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
