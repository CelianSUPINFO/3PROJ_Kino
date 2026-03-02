import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.users.me(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: JwtUser,
    @Body()
    body: {
      displayName?: string;
      bio?: string;
      website?: string;
      avatarUrl?: string;
      theme?: string;
      locale?: string;
    },
  ) {
    return this.users.updateMe(user.sub, body);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  export(@CurrentUser() user: JwtUser) {
    return this.users.exportData(user.sub);
  }

  @Get(':id')
  profile(@Param('id') id: string) {
    return this.users.publicProfile(id);
  }

  @Get(':id/followers')
  followers(@Param('id') id: string) {
    return this.users.followers(id);
  }

  @Get(':id/following')
  following(@Param('id') id: string) {
    return this.users.following(id);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  follow(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.users.follow(user.sub, id);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.users.unfollow(user.sub, id);
  }
}
