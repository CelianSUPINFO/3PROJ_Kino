import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('partners')
  partners(@CurrentUser() user: JwtUser) {
    return this.messages.partners(user.sub);
  }

  @Get(':userId')
  thread(@CurrentUser() user: JwtUser, @Param('userId') otherId: string) {
    return this.messages.thread(user.sub, otherId);
  }

  @Post()
  send(
    @CurrentUser() user: JwtUser,
    @Body() body: { recipientId: string; body: string },
  ) {
    return this.messages.send(user.sub, body.recipientId, body.body);
  }
}
