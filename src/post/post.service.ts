import {BadRequestException,ForbiddenException,Injectable,NotFoundException,}from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Prisma,VoteType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ListPostsDto } from './dto/list-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { NotificationType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
  @Injectable()
  export class PostService {
    constructor(
      private readonly prisma: PrismaService,
    ) {}
  
    async create(
      dto: CreatePostDto,
      userId: string,
    ) {
      try {
        // 1. Find the subreddit
        const subreddit =
          await this.prisma.subreddit.findUnique({
            where: {
              name: dto.subredditName,
            },
          });
  
        // 2. Validate subreddit exists
        if (!subreddit) {
          throw new NotFoundException(
            'Subreddit not found',
          );
        }
  
        // 3. Create the post
        const post = await this.prisma.post.create({
          data: {
            id: randomUUID(),  
            title: dto.title,  
            content: dto.content,  
            authorId: userId,
            subredditId: subreddit.id,
          },
  
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
  
            subreddit: {
              select: {
                id: true,
                name: true,
                title: true,
              },
            },
          },
        });
  
        // 4. Return a clean response
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          createdAt: post.createdAt,  
          author: post.author,
          subreddit: post.subreddit,
        };
      } catch (error) {
        console.log('=======================');
        console.log('POST CREATE ERROR');
        console.dir(error, { depth: null });
        console.log('=======================');
      
        throw error;
      }
    }
    async findOne(id: string) {
      const post = await this.prisma.post.findUnique({
        where: {
          id,
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
          subreddit: {
            select: {
              id: true,
              name: true,
              title: true,
            },
          },
        },
      });
    
      if (!post) {
        throw new NotFoundException(
          'Post not found',
        );
      }
    
      return post;
    }
    async findBySubreddit(
      name: string,
      query: ListPostsDto,
    ) {
      const { page, limit } = query;
    
      const subreddit =
        await this.prisma.subreddit.findUnique({
          where: {
            name,
          },
        });
    
      if (!subreddit) {
        throw new NotFoundException(
          'Subreddit not found',
        );
      }
    
      const posts =
        await this.prisma.post.findMany({
          where: {
            subredditId: subreddit.id,
          },
    
          include: {
            author: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
    
          orderBy: {
            createdAt: 'desc',
          },
    
          skip: (page - 1) * limit,
    
          take: limit,
        });
    
      const total =
        await this.prisma.post.count({
          where: {
            subredditId: subreddit.id,
          },
        });
    
      return {
        posts,
    
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
      dto: UpdatePostDto,
      userId: string,
    ) {
      const post =
        await this.prisma.post.findFirst({
          where: {
            id,
            deletedAt: null,
          },
        });
  
      if (!post) {
        throw new NotFoundException(
          'Post not found',
        );
      }
  
      if (post.authorId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to edit this post',
        );
      }
  
      const updatedPost =
        await this.prisma.post.update({
          where: {
            id,
          },
  
          data: {
            ...(dto.title && {
              title: dto.title,
            }),
  
            ...(dto.content && {
              content: dto.content,
            }),
          },
  
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
  
            subreddit: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
  
      return {
        message: 'Post updated successfully',
        post: updatedPost,
      };
    }
  
    async remove(
      id: string,
      userId: string,
    ) {
      const post =
        await this.prisma.post.findFirst({
          where: {
            id,
            deletedAt: null,
          },
        });
  
      if (!post) {
        throw new NotFoundException(
          'Post not found',
        );
      }
  
      if (post.authorId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to delete this post',
        );
      }
  
      await this.prisma.post.update({
        where: {
          id,
        },
  
        data: {
          deletedAt: new Date(),
        },
      });
  
      return {
        message: 'Post deleted successfully',
      };
    }
    async upvote(
      postId: string,
      userId: string,
    ) {
      return this.vote(
        postId,
        userId,
        VoteType.UPVOTE,
        
      );
    }
    
    
    
    async downvote(
      postId: string,
      userId: string,
    ) {
      return this.vote(
        postId,
        userId,
        VoteType.DOWNVOTE,
      );
    }
    
    private async vote(
      postId: string,
      userId: string,
      voteType: VoteType,
    ) {
      return this.prisma.$transaction(async (tx) => {
        const post = await tx.post.findUnique({
          where: {
            id: postId,
          },
        });
    
        if (!post || post.deletedAt) {
          throw new NotFoundException(
            'Post not found',
          );
        }
    
        const existingVote =
          await tx.vote.findUnique({
            where: {
              userId_postId: {
                userId,
                postId,
              },
            },
          });
    
        let shouldNotify = false;
        let message = '';
    
        // First vote
        if (!existingVote) {
          await tx.vote.create({
            data: {
              userId,
              postId,
              voteType,
            },
          });
    
          await tx.post.update({
            where: {
              id: postId,
            },
            data: {
              score: {
                increment:
                  voteType === VoteType.UPVOTE
                    ? 1
                    : -1,
              },
            },
          });
    
          shouldNotify =
            voteType === VoteType.UPVOTE;
    
          message = 'Vote added';
        }
    
        // Same vote
        else if (
          existingVote.voteType === voteType
        ) {
          return {
            message: 'Already voted',
          };
        }
    
        // Switch vote
        else {
          await tx.vote.update({
            where: {
              id: existingVote.id,
            },
            data: {
              voteType,
            },
          });
    
          await tx.post.update({
            where: {
              id: postId,
            },
            data: {
              score: {
                increment:
                  voteType === VoteType.UPVOTE
                    ? 2
                    : -2,
              },
            },
          });
    
          shouldNotify =
            voteType === VoteType.UPVOTE;
    
          message = 'Vote updated';
        }
    
        if (shouldNotify) {
          await this.notificationService.createNotification({
            recipientId: post.authorId,
            actorId: userId,
            postId: post.id,
            type: NotificationType.UPVOTE,
            title: 'Post upvoted',
            message:
              'Someone upvoted your post.',
          });
        }
    
        return {
          message,
        };
      });
    }
    
    async removeVote(
      postId: string,
      userId: string,
    ) {
      return this.prisma.$transaction(
        async (tx) => {
          const existingVote =
            await tx.vote.findUnique({
              where: {
                userId_postId: {
                  userId,
                  postId,
                },
              },
            });
    
          if (!existingVote) {
            throw new NotFoundException(
              'Vote not found',
            );
          }
    
          await tx.vote.delete({
            where: {
              id: existingVote.id,
            },
          });
    
          await tx.post.update({
            where: {
              id: postId,
            },
            data: {
              score: {
                increment:
                  existingVote.voteType ===
                  VoteType.UPVOTE
                    ? -1
                    : 1,
              },
            },
          });
    
          return {
            message:
              'Vote removed successfully',
          };
        },
      );
    }
  }