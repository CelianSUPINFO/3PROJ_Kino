import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/user.dto';

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
  updateMe(@CurrentUser() user: JwtUser, @Body() body: UpdateProfileDto) {
    return this.users.updateMe(user.sub, body);
  }

  @Post('me/images/:kind')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadProfileImage(
    @CurrentUser() user: JwtUser,
    @Param('kind') kind: 'avatar' | 'banner',
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.users.uploadProfileImage(user.sub, kind, file);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  export(@CurrentUser() user: JwtUser) {
    return this.users.exportData(user.sub);
  }

  @Get('export.csv')
  @UseGuards(JwtAuthGuard)
  async exportCsv(@CurrentUser() user: JwtUser, @Res() res: Response) {
    const csv = await this.users.exportCsv(user.sub);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="kino-export.csv"',
    );
    return res.send(csv);
  }

  @Delete('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  deleteMe(@CurrentUser() user: JwtUser) {
    return this.users.deleteMe(user.sub);
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
