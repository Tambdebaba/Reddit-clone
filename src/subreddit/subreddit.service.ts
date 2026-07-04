import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubredditDto } from './dto/create-subreddit.dto';
import { ListSubredditsDto } from './dto/list-subreddits.dto';
import { ListPostsDto } from '../post/dto/list-posts.dto';
import { ListMembersDto } from './dto/list-members.dto';

@Injectable()
export class SubredditService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubredditDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.subreddit.findUnique({ where: { name: dto.name } });
      if (existing) throw new BadRequestException('Subreddit name already taken');

      const subreddit = await tx.subreddit.create({
        data: {
          name: dto.name,
          title: dto.title,
          description: dto.description,
          rules: dto.rules,
          isNsfw: dto.isNsfw ?? false,
          creatorId: userId,
          memberCount: 1,
        },
      });

      await tx.membership.create({
        data: {
          subredditId: subreddit.id,
          userId,
          role: 'MODERATOR',
        },
      });

      return subreddit;
    });
  }

  async findOne(name: string) {
    const subreddit = await this.prisma.subreddit.findUnique({
      where: { name },
    });
    if (!subreddit) throw new NotFoundException('Subreddit not found');
    return subreddit;
  }

  async findAll(query: ListSubredditsDto) {
    const { page = 1, limit = 10 } = query;
    return this.prisma.subreddit.findMany({
      orderBy: { memberCount: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async join(name: string, userId: string) {
    const subreddit = await this.findOne(name);

    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.membership.findUnique({
        where: { userId_subredditId: { userId, subredditId: subreddit.id } },
      });
      if (exists) throw new BadRequestException('Already a member');

      await tx.membership.create({
        data: { subredditId: subreddit.id, userId, role: 'MEMBER' },
      });

      return tx.subreddit.update({
        where: { id: subreddit.id },
        data: { memberCount: { increment: 1 } },
      });
    });
  }

  async leave(name: string, userId: string) {
    const subreddit = await this.findOne(name);
    if (subreddit.creatorId === userId) throw new BadRequestException('Creators cannot leave their subreddit');

    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.membership.findUnique({
        where: { userId_subredditId: { userId, subredditId: subreddit.id } },
      });
      if (!exists) throw new BadRequestException('Not a member');

      await tx.membership.delete({
        where: { userId_subredditId: { userId, subredditId: subreddit.id } },
      });

      return tx.subreddit.update({
        where: { id: subreddit.id },
        data: { memberCount: { decrement: 1 } },
      });
    });
  }

  async findPosts(name: string, query: ListPostsDto) {
    const { page = 1, limit = 10 } = query;
    const subreddit = await this.findOne(name);

    return this.prisma.post.findMany({
      where: { subredditId: subreddit.id, deletedAt: null },
      orderBy: { createdAt: 'desc' }, // Leverages matching multi-column index cleanly
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async findMembers(name: string, query: ListMembersDto) {
    const { page = 1, limit = 20 } = query;
    const subreddit = await this.findOne(name);

    return this.prisma.membership.findMany({
      where: { subredditId: subreddit.id },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }
}