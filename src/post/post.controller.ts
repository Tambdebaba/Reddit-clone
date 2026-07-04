import { Body, Controller, Delete, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Get, Param,Query } from '@nestjs/common';
import { ListPostsDto } from './dto/list-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { NotificationService } from '../notification/notification.service';
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
    
    constructor(
        private readonly prisma: PrismaService,
        private readonly postService: PostService,
        private readonly notificationService: NotificationService,
    ) {}
    @Post()
    create(
        @Body() dto: CreatePostDto, 
        @CurrentUser() user: JwtPayload, 
    ) {
        return this.postService.create(
        dto,
        user.sub,
        );
    }
    @Get(':id')
    findOne(
        @Param('id') id: string,
    ) {
        return this.postService.findOne(id);
    }
    @Get('/subreddit/:name')
    findBySubreddit(
      @Param('name') name: string,
      @Query() query: ListPostsDto,
    ) {
      return this.postService.findBySubreddit(
        name,
        query,
      );
    }
    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() dto: UpdatePostDto,
      @CurrentUser() user: JwtPayload,
    ) {
      return this.postService.update(
        id,
        dto,
        user.sub,
      );
    }
    
    @Delete(':id')
    remove(
      @Param('id') id: string,
      @CurrentUser() user: JwtPayload,
    ) {
      return this.postService.remove(
        id,
        user.sub,
      );
    }
    @Post(':id/upvote')
    upvote(
      @Param('id') postId: string,
      @CurrentUser() user: JwtPayload,
    ) {
      return this.postService.upvote(
        postId,
        user.sub,
      );
    }
    
    @Post(':id/downvote')
    downvote(
      @Param('id') postId: string,
      @CurrentUser() user: JwtPayload,
    ) {
      return this.postService.downvote(
        postId,
        user.sub,
      );
    }
    
    @Delete(':id/vote')
    removeVote(
      @Param('id') postId: string,
      @CurrentUser() user: JwtPayload,
    ) {
      return this.postService.removeVote(
        postId,
        user.sub,
      );
    }
}
