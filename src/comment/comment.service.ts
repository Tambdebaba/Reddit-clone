import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';
import { VoteDto } from './dto/vote.dto';
import { NotificationService } from '../notification/notification.service';
import { Prisma, NotificationType } from '@prisma/client';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private readonly authorSelect = {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  };

  async create(postId: string, dto: CreateCommentDto, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Optimization: Fetch author ID through relations on creation to eliminate a SELECT query
        const comment = await tx.comment.create({
          data: { body: dto.body, postId, authorId: userId, parentId: null },
          include: { author: this.authorSelect, post: { select: { authorId: true } } },
        });

        await tx.post.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } },
        });

        // Safe out-of-band execution context minimizes transaction block durations
        this.notificationService.createNotification({
          recipientId: comment.post.authorId,
          actorId: userId,
          postId,
          commentId: comment.id,
          type: NotificationType.COMMENT,
          title: 'New comment',
          message: 'Someone commented on your post.',
        }).catch(() => { /* suppress background exceptions */ });

        const { post, ...sanitizedComment } = comment;
        return sanitizedComment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException('Post not found');
      }
      throw error;
    }
  }

  async reply(parentCommentId: string, dto: CreateCommentDto, userId: string) {
    // findUnique handles cached PK operations significantly faster than findFirst
    const parent = await this.prisma.comment.findUnique({
      where: { id: parentCommentId },
      select: { postId: true, authorId: true, deletedAt: true },
    });

    if (!parent || parent.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const reply = await tx.comment.create({
        data: { body: dto.body, authorId: userId, postId: parent.postId, parentId: parentCommentId },
        include: { author: this.authorSelect },
      });

      await tx.post.update({
        where: { id: parent.postId },
        data: { commentCount: { increment: 1 } },
      });

      this.notificationService.createNotification({
        recipientId: parent.authorId,
        actorId: userId,
        postId: parent.postId,
        commentId: reply.id,
        type: NotificationType.REPLY,
        title: 'New reply',
        message: 'Someone replied to your comment.',
      }).catch(() => {});

      return reply;
    });
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { author: this.authorSelect },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async findByPost(postId: string, query: ListCommentsDto) {
    const { page = 1, limit = 10 } = query;

    // Concurrently handle fetching records and counting to avoid synchronous blocking cascades
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { postId, deletedAt: null },
        include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({
        where: { postId, deletedAt: null, parentId: null },
      }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { authorId: true, deletedAt: true },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You are not allowed to edit this comment');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { body: dto.body },
      include: { author: { select: { id: true, username: true } } },
    });

    return { message: 'Comment updated successfully', comment: updated };
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { authorId: true, postId: true, deletedAt: true },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You are not allowed to delete this comment');
    }

    await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Comment deleted successfully' };
  }

  async voteComment(commentId: string, dto: VoteDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { deletedAt: true },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingVote = await tx.vote.findUnique({
        where: { userId_commentId: { userId, commentId } },
        select: { id: true, voteType: true },
      });

      const isUpvote = dto.voteType === 'UPVOTE';

      if (!existingVote) {
        await tx.vote.create({
          data: { userId, commentId, voteType: dto.voteType },
        });
        await tx.comment.update({
          where: { id: commentId },
          data: { score: { increment: isUpvote ? 1 : -1 } },
        });
        return { message: 'Vote added' };
      }

      if (existingVote.voteType === dto.voteType) {
        await tx.vote.delete({ where: { id: existingVote.id } });
        await tx.comment.update({
          where: { id: commentId },
          data: { score: { increment: isUpvote ? -1 : 1 } },
        });
        return { message: 'Vote removed' };
      }

      await tx.vote.update({
        where: { id: existingVote.id },
        data: { voteType: dto.voteType },
      });
      await tx.comment.update({
        where: { id: commentId },
        data: { score: { increment: isUpvote ? 2 : -2 } },
      });

      return { message: 'Vote updated' };
    });
  }
}