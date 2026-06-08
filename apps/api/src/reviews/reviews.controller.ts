import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { ReviewsService } from './reviews.service';
import {
  CreateCommentDto,
  CreateReviewDto,
  FeaturedReviewDto,
  ReportReviewDto,
} from './dto/review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('work/:type/:tmdbId')
  @UseGuards(OptionalJwtAuthGuard)
  forWork(
    @Param('type') type: string,
    @Param('tmdbId', ParseIntPipe) tmdbId: number,
  ) {
    const mediaType = type === 'tv' ? MediaType.TV : MediaType.MOVIE;
    return this.reviews.listForWork(tmdbId, mediaType);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: JwtUser,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviews.upsertReview(
      user.sub,
      body.tmdbId,
      body.mediaType,
      body.rating,
      body.body?.trim() ?? '',
      body.spoiler ?? false,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.reviews.deleteReview(user.sub, id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  like(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.reviews.toggleLike(user.sub, id);
  }

  @Get(':id/comments')
  comments(@Param('id') id: string) {
    return this.reviews.listComments(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: CreateCommentDto,
  ) {
    return this.reviews.addComment(user.sub, id, body.body, body.parentId);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  removeComment(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.reviews.deleteComment(user.sub, user.role, id);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  report(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: ReportReviewDto,
  ) {
    return this.reviews.reportReview(user.sub, id, body.reason);
  }

  @Post('admin/:id/featured')
  @UseGuards(JwtAuthGuard, AdminGuard)
  featured(@Param('id') id: string, @Body() body: FeaturedReviewDto) {
    return this.reviews.setFeatured(id, body.featured);
  }
}
