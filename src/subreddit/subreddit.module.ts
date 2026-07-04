import { Module } from '@nestjs/common';
import { SubredditController } from './subreddit.controller';
import { SubredditService } from './subreddit.service';
import { PrismaModule } from '../prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [SubredditController],
  providers: [SubredditService]
})
export class SubredditModule {}
