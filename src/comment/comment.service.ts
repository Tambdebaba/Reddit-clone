import {ForbiddenException,Injectable,NotFoundException,}from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';
import { VoteDto } from './dto/vote.dto';
import { NotificationService } from '../notification/notification.service';
import { PostService } from '../post/post.service';
import { NotificationType } from '@prisma/client';
  @Injectable()
  export class CommentService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly notificationService: NotificationService,
    ) {}
  
    async create(
      postId: string,
      dto: CreateCommentDto,
      userId: string,
    ) {
      return this.prisma.$transaction(async (tx) => {
        const post = await tx.post.findFirst({
          where: {
            id: postId,
            deletedAt: null,
          },
        });
  
        if (!post) {
          throw new NotFoundException(
            'Post not found',
          );
        }
  
        const comment = await tx.comment.create({
          data: {
            body: dto.body,
            postId,
            authorId: userId,
            parentId: null,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });
  
        await tx.post.update({
          where: {
            id: postId,
          },
          data: {
            commentCount: {
              increment: 1,
            },
          },
        });
        await this.notificationService.createNotification({
          recipientId: post.authorId,
          actorId: userId,
          postId: post.id,
          commentId: comment.id,
          type: NotificationType.COMMENT,
          title: 'New comment',
          message: 'Someone commented on your post.',
        });
  
        return comment;
      });
      
    }
    
  
    async reply(
      parentCommentId: string,
      dto: CreateCommentDto,
      userId: string,
    ) {
      return this.prisma.$transaction(async (tx) => {
        const parent = await tx.comment.findFirst({
          where: {
            id: parentCommentId,
            deletedAt: null,
          },
        });
  
        if (!parent) {
          throw new NotFoundException(
            'Comment not found',
          );
        }
  
        const reply = await tx.comment.create({
          data: {
            body: dto.body,
            authorId: userId,
            postId: parent.postId,
            parentId: parent.id,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });
  
        await tx.post.update({
          where: {
            id: parent.postId,
          },
          data: {
            commentCount: {
              increment: 1,
            },
          },
        });
        await this.notificationService.createNotification({
          recipientId: parent.authorId,
          actorId: userId,
          postId: parent.postId,
          commentId: reply.id,
          type: NotificationType.REPLY,
          title: 'New reply',
          message: 'Someone replied to your comment.',
        });
  
        return reply;
      });
      
    }
  
    async findOne(id: string) {
      const comment =
        await this.prisma.comment.findFirst({
          where: {
            id,
            deletedAt: null,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });
  
      if (!comment) {
        throw new NotFoundException(
          'Comment not found',
        );
      }
  
      return comment;
    }
  
    async findByPost(
      postId: string,
      query: ListCommentsDto,
    ) {
      const { page, limit } = query;
  
      const post =
        await this.prisma.post.findFirst({
          where: {
            id: postId,
            deletedAt: null,
          },
        });
  
      if (!post) {
        throw new NotFoundException(
          'Post not found',
        );
      }
  
      const comments =
        await this.prisma.comment.findMany({
          where: {
            postId,
            deletedAt: null,
          },
  
          include: {
            author: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
  
          orderBy: {
            createdAt: 'asc',
          },
  
          skip: (page - 1) * limit,
  
          take: limit,
        });
  
      const total =
        await this.prisma.comment.count({
          where: {
            postId,
            deletedAt: null,
            parentId: null,
          },
        });
  
      return {
        comments,
  
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(
            total / limit,
          ),
        },
      };
    }
  
    async update(
      id: string,
      dto: UpdateCommentDto,
      userId: string,
    ) {
      const comment =
        await this.prisma.comment.findFirst({
          where: {
            id,
            deletedAt: null,
          },
        });
  
      if (!comment) {
        throw new NotFoundException(
          'Comment not found',
        );
      }
  
      if (comment.authorId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to edit this comment',
        );
      }
  
      const updated =
        await this.prisma.comment.update({
          where: {
            id,
          },
          data: {
            body: dto.body,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                
              },
            },
          },
        });
  
      return {
        message:
          'Comment updated successfully',
        comment: updated,
      };
    }
  
    async remove(
      id: string,
      userId: string,
    ) {
      return this.prisma.$transaction(async (tx) => {
        const comment =
          await tx.comment.findFirst({
            where: {
              id,
              deletedAt: null,
            },
          });
  
        if (!comment) {
          throw new NotFoundException(
            'Comment not found',
          );
        }
  
        if (comment.authorId !== userId) {
          throw new ForbiddenException(
            'You are not allowed to delete this comment',
          );
        }
  
        await tx.comment.update({
          where: {
            id,
          },
          data: {
            deletedAt: new Date(),
          },
        });
  
        await tx.post.update({
          where: {
            id: comment.postId,
          },
          data: {
            commentCount: {
              decrement: 1,
            },
          },
        });
  
        return {
          message:
            'Comment deleted successfully',
        };
      });
    }
    async voteComment(
      commentId: string,
      dto: VoteDto,
      userId: string,
    ) {
      return this.prisma.$transaction(async (tx) => {

        const comment = await tx.comment.findFirst({
          where: {
            id: commentId,
            deletedAt: null,
          },
        });
    
        if (!comment) {
          throw new NotFoundException(
            'Comment not found',
          );
        }
    
        const existingVote =
          await tx.vote.findUnique({
            where: {
              userId_commentId: {
                userId,
                commentId,
              },
            },
          });
    
        if (!existingVote) {
          await tx.vote.create({
            data: {
              userId,
              commentId,
              voteType: dto.voteType,
            },
          });
    
          await tx.comment.update({
            where: {
              id: commentId,
            },
            data: {
              score: {
                increment:
                  dto.voteType === 'UPVOTE'
                    ? 1
                    : -1,
              },
            },
          });
    
          return {
            message: 'Vote added',
          };
        }
    
        if (
          existingVote.voteType ===
          dto.voteType
        ) {
          await tx.vote.delete({
            where: {
              id: existingVote.id,
            },
          });
    
          await tx.comment.update({
            where: {
              id: commentId,
            },
            data: {
              score: {
                increment:
                  dto.voteType === 'UPVOTE'
                    ? -1
                    : 1,
              },
            },
          });
    
          return {
            message: 'Vote removed',
          };
        }

        await tx.vote.update({
          where: {
            id: existingVote.id,
          },
          data: {
            voteType: dto.voteType,
          },
        });
    
        await tx.comment.update({
          where: {
            id: commentId,
          },
          data: {
            score: {
              increment:
                dto.voteType === 'UPVOTE'
                  ? 2
                  : -2,
            },
          },
        });
    
        return {
          message: 'Vote updated',
        };
      });
    }
    
  }