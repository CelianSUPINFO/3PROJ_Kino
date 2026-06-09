import { ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  const blocked = jest.fn();
  const followFindUnique = jest.fn();
  const messageCreate = jest.fn();
  const notify = jest.fn();
  const push = jest.fn();
  const service = new MessagesService(
    {
      userBlock: { findFirst: blocked },
      follow: { findUnique: followFindUnique },
      message: { create: messageCreate },
    } as never,
    { createAndDeliver: notify } as never,
    { pushToUser: push } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    blocked.mockResolvedValue(null);
  });

  it('rejects messages without a mutual follow', async () => {
    followFindUnique.mockResolvedValueOnce({}).mockResolvedValueOnce(null);

    await expect(service.send('sender', 'recipient', 'Hello')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('creates and delivers messages between mutual followers', async () => {
    followFindUnique.mockResolvedValue({});
    messageCreate.mockResolvedValue({
      id: 'message',
      senderId: 'sender',
      recipientId: 'recipient',
      body: 'Hello',
    });

    await service.send('sender', 'recipient', 'Hello');

    expect(push).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(
      'recipient',
      'NEW_MESSAGE',
      expect.objectContaining({ messageId: 'message' }),
    );
  });
});
