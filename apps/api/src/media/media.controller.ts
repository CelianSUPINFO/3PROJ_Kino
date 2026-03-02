import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { TmdbService } from './tmdb.service';

@Controller('media')
export class MediaController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  search(
    @Query('q') q: string,
    @Query('page') page = '1',
    @Query('year') year?: string,
    @Query('genre') genre?: string,
  ) {
    return this.tmdb.search(
      q ?? '',
      Math.max(1, parseInt(page, 10) || 1),
      year ? parseInt(year, 10) : undefined,
      genre ? parseInt(genre, 10) : undefined,
    );
  }

  @Get('discover/:type')
  @UseGuards(OptionalJwtAuthGuard)
  discover(
    @Param('type') type: string,
    @Query('page') page = '1',
    @Query('sort') sort = 'popularity.desc',
    @Query('year') year?: string,
    @Query('genre') genre?: string,
  ) {
    const mediaType = type === 'tv' ? MediaType.TV : MediaType.MOVIE;
    return this.tmdb.discover(
      mediaType,
      Math.max(1, parseInt(page, 10) || 1),
      sort,
      year ? parseInt(year, 10) : undefined,
      genre ? parseInt(genre, 10) : undefined,
    );
  }

  @Get(':type/:tmdbId')
  @UseGuards(OptionalJwtAuthGuard)
  details(
    @Param('type') type: string,
    @Param('tmdbId', ParseIntPipe) tmdbId: number,
  ) {
    const mediaType = type === 'tv' ? MediaType.TV : MediaType.MOVIE;
    return this.tmdb.getDetails(mediaType, tmdbId);
  }
}
