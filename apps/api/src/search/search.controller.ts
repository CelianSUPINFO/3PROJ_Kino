import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  unified(
    @Query('q') q: string,
    @Query('page') page = '1',
    @Query('year') year?: string,
    @Query('genre') genre?: string,
    @Query('minVote') minVote?: string,
    @Query('type') type?: string,
  ) {
    return this.search.unified(
      q ?? '',
      Math.max(1, parseInt(page, 10) || 1),
      year ? parseInt(year, 10) : undefined,
      genre ? parseInt(genre, 10) : undefined,
      minVote ? parseFloat(minVote) : undefined,
      type === 'movie' || type === 'tv' ? type : undefined,
    );
  }
}
