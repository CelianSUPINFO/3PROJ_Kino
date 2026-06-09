import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const notificationCreate = jest.fn();
  const userFindUnique = jest.fn();
  const push = jest.fn();
  const service = new NotificationsService(
    {
      notification: { create: notificationCreate },
      user: { findUnique: userFindUnique },
    } as never,
    { pushToUser: push } as never,
    { get: jest.fn().mockReturnValue(undefined) } as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('persists and emits an in-app notification', async () => {
    notificationCreate.mockResolvedValue({ id: 'notification', type: 'NEW_FOLLOWER' });
    userFindUnique.mockResolvedValue({
      email: 'user@kino.test',
      notifyPush: false,
      notifyEmail: false,
    });

    const result = await service.createAndDeliver('user', 'NEW_FOLLOWER', {
      followerId: 'follower',
    });

    expect(result.id).toBe('notification');
    expect(push).toHaveBeenCalledWith(
      'user',
      'notification:new',
      expect.objectContaining({ id: 'notification' }),
    );
  });

  it('does not emit when the target user no longer exists', async () => {
    notificationCreate.mockResolvedValue({ id: 'notification' });
    userFindUnique.mockResolvedValue(null);

    await service.createAndDeliver('missing', 'NEW_FOLLOWER', {});

    expect(push).not.toHaveBeenCalled();
  });
});
