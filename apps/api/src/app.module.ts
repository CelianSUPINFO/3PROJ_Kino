import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MediaModule } from './media/media.module';
import { UsersModule } from './users/users.module';
import { LibraryModule } from './library/library.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FeedModule } from './feed/feed.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagesModule } from './messages/messages.module';
import { SearchModule } from './search/search.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MediaModule,
    UsersModule,
    LibraryModule,
    ReviewsModule,
    FeedModule,
    NotificationsModule,
    MessagesModule,
    SearchModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
