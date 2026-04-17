import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MediaType, WatchStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { LibraryService } from './library.service';

@Controller('library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Post('status')
  @UseGuards(JwtAuthGuard)
  setStatus(
    @CurrentUser() user: JwtUser,
    @Body()
    body: { tmdbId: number; mediaType: MediaType; status: WatchStatus },
  ) {
    return this.library.setStatus(
      user.sub,
      body.tmdbId,
      body.mediaType,
      body.status,
    );
  }

  @Delete('status/:type/:tmdbId')
  @UseGuards(JwtAuthGuard)
  removeStatus(
    @CurrentUser() user: JwtUser,
    @Param('type') type: string,
    @Param('tmdbId', ParseIntPipe) tmdbId: number,
  ) {
    const mediaType = type === 'tv' ? MediaType.TV : MediaType.MOVIE;
    return this.library.removeStatus(user.sub, tmdbId, mediaType);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  myLibrary(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: WatchStatus,
  ) {
    return this.library.listByUser(user.sub, status);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  stats(@CurrentUser() user: JwtUser) {
    return this.library.stats(user.sub);
  }

  @Post('lists')
  @UseGuards(JwtAuthGuard)
  createList(
    @CurrentUser() user: JwtUser,
    @Body() body: { name: string; isPublic: boolean },
  ) {
    return this.library.createList(user.sub, body.name, body.isPublic);
  }

  @Patch('lists/:id')
  @UseGuards(JwtAuthGuard)
  updateList(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: { name?: string; isPublic?: boolean },
  ) {
    return this.library.updateList(user.sub, id, body);
  }

  @Delete('lists/:id')
  @UseGuards(JwtAuthGuard)
  deleteList(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.library.deleteList(user.sub, id);
  }

  @Post('lists/:id/items')
  @UseGuards(JwtAuthGuard)
  addItem(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: { tmdbId: number; mediaType: MediaType },
  ) {
    return this.library.addToList(user.sub, id, body.tmdbId, body.mediaType);
  }

  @Delete('lists/:id/items/:type/:tmdbId')
  @UseGuards(JwtAuthGuard)
  removeItem(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Param('type') type: string,
    @Param('tmdbId', ParseIntPipe) tmdbId: number,
  ) {
    const mediaType = type === 'tv' ? MediaType.TV : MediaType.MOVIE;
    return this.library.removeFromList(user.sub, id, tmdbId, mediaType);
  }

  @Get('lists/mine')
  @UseGuards(JwtAuthGuard)
  myLists(@CurrentUser() user: JwtUser) {
    return this.library.myLists(user.sub);
  }

  /** Après routes statiques `lists/mine` pour éviter que `mine` soit pris pour un :id */
  @Get('lists/:id')
  @UseGuards(OptionalJwtAuthGuard)
  oneList(
    @Param('id') id: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.library.getListPublic(id, user?.sub);
  }
}
