import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaController } from './media.controller';
import { TmdbService } from './tmdb.service';

@Module({
  imports: [PrismaModule],
  controllers: [MediaController],
  providers: [TmdbService],
  exports: [TmdbService],
})
export class MediaModule {}
