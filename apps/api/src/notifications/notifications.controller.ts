import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { PushTokenDto } from './dto/push-token.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.notifications.list(user.sub);
  }

  @Post('push-token')
  registerPushToken(@CurrentUser() user: JwtUser, @Body() body: PushTokenDto) {
    return this.notifications.registerPushToken(user.sub, body.token, body.platform);
  }

  @Delete('push-token')
  removePushToken(@CurrentUser() user: JwtUser, @Body() body: PushTokenDto) {
    return this.notifications.removePushToken(user.sub, body.token);
  }

  @Patch('read-all')
  readAll(@CurrentUser() user: JwtUser) {
    return this.notifications.markAllRead(user.sub);
  }

  @Patch(':id/read')
  readOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }
}
