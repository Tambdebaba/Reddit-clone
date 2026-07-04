import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Prisma, VoteType, NotificationType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreatePostDto, userId: string) {
    try {
      // Connect handles linking and throws a structural Prisma error if the subreddit doesn't exist
      return await this.prisma.post.create({
        data: {
          title: dto.title,
          content: dto.content,
          author: { connect: { id: userId } },
          subreddit: { connect: { name: dto.subredditName } },
        },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, username: true } },
          subreddit: { select: { id: true, name: true, title: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Subreddit not found');
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        subreddit: { select: { id: true, name: true, title: true } },
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async findBySubreddit(name: string, query: ListPostsDto) {
    const { page = 1, limit = 10 } = query;

    const subreddit = await this.prisma.subreddit.findUnique({ where: { name } });
    if (!subreddit) throw new NotFoundException('Subreddit not found');

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { subredditId: subreddit.id },
        include: { author: { select: { username: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where: { subredditId: subreddit.id } }),
    ]);

    return {
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: UpdatePostDto, userId: string) {
    const post = await this.prisma.post.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You are not allowed to edit this post');

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: { title: dto.title, content: dto.content },
      include: {
        author: { select: { id: true, username: true } },
        subreddit: { select: { id: true, name: true } },
      },
    });

    return { message: 'Post updated successfully', post: updatedPost };
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You are not allowed to delete this post');

    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Post deleted successfully' };
  }

  async upvote(postId: string, userId: string) {
    return this.vote(postId, userId, VoteType.UPVOTE);
  }

  async downvote(postId: string, userId: string) {
    return this.vote(postId, userId, VoteType.DOWNVOTE);
  }

  private async vote(postId: string, userId: string, voteType: VoteType) {
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: postId } });
      if (!post || post.deletedAt) throw new NotFoundException('Post not found');

      const existingVote = await tx.vote.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingVote?.voteType === voteType) {
        return { message: 'Already voted' };
      }

      let scoreDelta = voteType === VoteType.UPVOTE ? 1 : -1;
      let message = 'Vote added';

      if (existingVote) {
        scoreDelta *= 2; // Switching votes requires doubling the impact direction
        message = 'Vote updated';
      }

      await tx.vote.upsert({
        where: { userId_postId: { userId, postId } },
        update: { voteType },
        create: { userId, postId, voteType },
      });

      await tx.post.update({
        where: { id: postId },
        data: { score: { increment: scoreDelta } },
      });

      if (voteType === VoteType.UPVOTE) {
        await this.notificationService.createNotification({
          recipientId: post.authorId,
          actorId: userId,
          postId: post.id,
          type: NotificationType.UPVOTE,
          title: 'Post upvoted',
          message: 'Someone upvoted your post.',
        });
      }

      return { message };
    });
  }

  async removeVote(postId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existingVote = await tx.vote.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (!existingVote) throw new NotFoundException('Vote not found');

      await tx.vote.delete({ where: { id: existingVote.id } });

      const scoreDelta = existingVote.voteType === VoteType.UPVOTE ? -1 : 1;
      await tx.post.update({
        where: { id: postId },
        data: { score: { increment: scoreDelta } },
      });

      return { message: 'Vote removed successfully' };
    });
  }
}