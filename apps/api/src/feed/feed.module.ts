import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [MediaModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
