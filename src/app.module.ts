import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SubredditModule } from './subreddit/subreddit.module';
import { PostModule } from './post/post.module';
import { CommentModule } from './comment/comment.module';
import { FeedModule } from './feed/feed.module';
import { SearchModule } from './search/search.module';
import { NotificationModule } from './notification/notification.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    UsersModule,
    AuthModule,
    SubredditModule,
    PostModule,
    CommentModule,
    FeedModule,
    SearchModule,
    NotificationModule,
    ReportModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}