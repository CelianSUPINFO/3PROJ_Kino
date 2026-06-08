import { validate } from 'class-validator';
import { MediaType } from '@prisma/client';
import { CreateReviewDto } from './review.dto';

describe('CreateReviewDto', () => {
  it('allows a rating without review text', async () => {
    const dto = new CreateReviewDto();
    dto.tmdbId = 550;
    dto.mediaType = MediaType.MOVIE;
    dto.rating = 4;
    dto.body = '';

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
