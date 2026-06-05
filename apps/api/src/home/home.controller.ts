import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  getHome(@CurrentUser() user?: JwtUser, @Query('language') language = 'fr-FR') {
    return this.home.getHome(user, language === 'en' || language === 'en-US' ? 'en-US' : 'fr-FR');
  }
}
