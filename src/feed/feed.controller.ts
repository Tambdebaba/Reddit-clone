import {
    Controller,
    Get,
    Query,
  } from '@nestjs/common';
  
  import { FeedService } from './feed.service';
  import { ListFeedDto } from './dto/list-feed.dto';
  
  @Controller('feed')
  export class FeedController {
    constructor(
      private readonly feedService: FeedService,
    ) {}
  
    @Get()
    findFeed(
      @Query() query: ListFeedDto,
    ) {
      return this.feedService.findFeed(query);
    }
  }