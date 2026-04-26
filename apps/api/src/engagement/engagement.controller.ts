import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { EngagementService } from './engagement.service';

@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Get('summary')
  @UseGuards(OptionalJwtAuthGuard)
  summary(@CurrentUser() user?: JwtUser) {
    return this.engagement.summary(user);
  }
}
