import {Body,Controller,Get,Param,Post, UseGuards,Query,Delete}from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateSubredditDto } from './dto/create-subreddit.dto';
import { SubredditService } from './subreddit.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListSubredditsDto } from './dto/list-subreddits.dto';
import { ListPostsDto } from '../post/dto/list-posts.dto';
import { ListMembersDto } from './dto/list-members.dto';
@Controller('subreddits')
@UseGuards(JwtAuthGuard)
  export class SubredditController {
    constructor(
      private readonly subredditService: SubredditService,
    ) {}
  
    @Post()
    create(
      @Body() dto: CreateSubredditDto,
      @CurrentUser() user: JwtPayload,
    ) {
      return this.subredditService.create(
        dto,
        user.sub,
      );
    }
    @Get(':name')
    findOne(
    @Param('name') name: string,
    ) {
      return this.subredditService.findOne(name);
    }
    @Get()
    findAll(
    @Query() query: ListSubredditsDto,
    ) {
      return this.subredditService.findAll(query);
    }
    @Post(':name/join')
    join(
    @Param('name') name: string,
    @CurrentUser() user: JwtPayload,
    ) {
      return this.subredditService.join(
      name,
      user.sub,
    );
    }
    @Delete(':name/leave')
    leave(
      @Param('name') name: string,
      @CurrentUser() user: JwtPayload,
    ) {
      return this.subredditService.leave(
      name,
      user.sub,
      );
    }
    @Get(':name/posts')
    findPosts(
      @Param('name') name: string,
      @Query() query: ListPostsDto,
    ) {
      return this.subredditService.findPosts(
        name,
        query,
      );
    }
    @Get(':name/members')
    findMembers(
      @Param('name') name: string,
      @Query() query: ListMembersDto,
    ) {
      return this.subredditService.findMembers(
        name,
        query,
      );
    }
    @Get('me/joined')
    @UseGuards(JwtAuthGuard)
    findJoined(
      @CurrentUser() user: JwtPayload,
    ) {
      return this.subredditService.findJoined(
        user.sub,
      );
    }
    
  }