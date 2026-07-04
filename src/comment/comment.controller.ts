import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';
import { VoteDto } from './dto/vote.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('posts/:id/comments')
  create(@Param('id') postId: string, @Body() dto: CreateCommentDto, @CurrentUser() user: JwtPayload) {
    return this.commentService.create(postId, dto, user.sub);
  }

  @Post('comments/:id/reply')
  reply(@Param('id') parentCommentId: string, @Body() dto: CreateCommentDto, @CurrentUser() user: JwtPayload) {
    return this.commentService.reply(parentCommentId, dto, user.sub);
  }

  @Get('comments/:id')
  findOne(@Param('id') id: string) {
    return this.commentService.findOne(id);
  }

  @Get('posts/:id/comments')
  findByPost(@Param('id') postId: string, @Query() query: ListCommentsDto) {
    return this.commentService.findByPost(postId, query);
  }

  @Patch('comments/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCommentDto, @CurrentUser() user: JwtPayload) {
    return this.commentService.update(id, dto, user.sub);
  }

  @Delete('comments/:id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.commentService.remove(id, user.sub);
  }

  @Post('comments/:id/vote')
  vote(@Param('id') id: string, @Body() dto: VoteDto, @CurrentUser() user: JwtPayload) {
    return this.commentService.voteComment(id, dto, user.sub);
  }
}