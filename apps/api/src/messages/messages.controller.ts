import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { ReportMessageDto, SendMessageDto } from './dto/message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('partners')
  partners(@CurrentUser() user: JwtUser) {
    return this.messages.partners(user.sub);
  }

  @Get('available')
  available(@CurrentUser() user: JwtUser) {
    return this.messages.available(user.sub);
  }

  @Get(':userId')
  thread(@CurrentUser() user: JwtUser, @Param('userId') otherId: string) {
    return this.messages.thread(user.sub, otherId);
  }

  @Post()
  send(@CurrentUser() user: JwtUser, @Body() body: SendMessageDto) {
    return this.messages.send(user.sub, body.recipientId, body.body.trim());
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.messages.remove(user.sub, id);
  }

  @Post(':id/report')
  report(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() body: ReportMessageDto) {
    return this.messages.report(user.sub, id, body.reason);
  }

  @Post(':userId/typing')
  typing(@CurrentUser() user: JwtUser, @Param('userId') recipientId: string, @Body() body: { active: boolean }) {
    return this.messages.typing(user.sub, recipientId, Boolean(body.active));
  }
}
