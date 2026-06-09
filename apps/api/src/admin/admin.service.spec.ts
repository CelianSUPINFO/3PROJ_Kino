import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';

describe('Administration', () => {
  it('rejects non-admin users', () => {
    const guard = new AdminGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'USER' } }) }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });

  it('allows admin users', () => {
    const guard = new AdminGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('deletes an existing review and rejects a missing one', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'review' })
      .mockResolvedValueOnce(null);
    const deleteReview = jest.fn();
    const service = new AdminService({
      review: { findUnique, delete: deleteReview },
    } as never);

    await expect(service.deleteReview('review')).resolves.toEqual({ ok: true });
    expect(deleteReview).toHaveBeenCalledWith({ where: { id: 'review' } });
    await expect(service.deleteReview('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
