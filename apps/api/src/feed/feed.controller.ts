import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { FeedService } from './feed.service';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  list(
    @CurrentUser() user: JwtUser,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.feed.forUser(
      user.sub,
      cursor,
      take ? Math.min(50, parseInt(take, 10) || 20) : 20,
    );
  }
}
