import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  unified(@Query('q') q: string, @Query('page') page = '1') {
    return this.search.unified(q ?? '', Math.max(1, parseInt(page, 10) || 1));
  }
}
