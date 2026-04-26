import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MediaType, SwipeChoice } from '@prisma/client';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { RecommendationsService } from './recommendations.service';

@Controller('reco')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('tonight')
  @UseGuards(OptionalJwtAuthGuard)
  tonight(
    @CurrentUser() user?: JwtUser,
    @Query('type') type = 'movie',
    @Query('limit') limit = '20',
    @Query('page') page = '1',
  ) {
    const mediaType = type === 'tv' ? MediaType.TV : MediaType.MOVIE;
    return this.recommendations.tonight(
      user,
      mediaType,
      Math.min(30, Math.max(1, parseInt(limit, 10) || 20)),
      Math.max(1, parseInt(page, 10) || 1),
    );
  }

  @Post('swipe')
  @UseGuards(JwtAuthGuard)
  swipe(
    @CurrentUser() user: JwtUser,
    @Body('tmdbId', ParseIntPipe) tmdbId: number,
    @Body('type') type: string,
    @Body('choice') choice: string,
  ) {
    const mediaType = type === 'tv' ? MediaType.TV : MediaType.MOVIE;
    const normalizedChoice =
      choice === SwipeChoice.SMASH ? SwipeChoice.SMASH : SwipeChoice.PASS;
    return this.recommendations.swipe(
      user.sub,
      tmdbId,
      mediaType,
      normalizedChoice,
    );
  }
}
