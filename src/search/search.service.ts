import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { SearchDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async search(
    dto: SearchDto,
  ) {
    const { q, page, limit } = dto;

    const [posts, users, subreddits] =
      await Promise.all([
        this.searchPosts(
          q,
          page,
          limit,
        ),

        this.searchUsers(
          q,
          page,
          limit,
        ),

        this.searchSubreddits(
          q,
          page,
          limit,
        ),
      ]);

    return {
      posts,
      users,
      subreddits,
    };
  }

  private async searchPosts(
    q: string,
    page: number,
    limit: number,
  ) {
    return this.prisma.post.findMany({
      where: {
        deletedAt: null,

        OR: [
          {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },

          {
            content: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },

      include: {
        author: {
          select: {
            username: true,
            displayName: true,
          },
        },

        subreddit: {
          select: {
            name: true,
            title: true,
          },
        },
      },

      orderBy: {
        score: 'desc',
      },

      skip:
        (page - 1) * limit,

      take: limit,
    });
  }

  private async searchUsers(
    q: string,
    page: number,
    limit: number,
  ) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,

        OR: [
          {
            username: {
              contains: q,
              mode: 'insensitive',
            },
          },

          {
            displayName: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },

      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },

      orderBy: {
        username: 'asc',
      },

      skip:
        (page - 1) * limit,

      take: limit,
    });
  }

  private async searchSubreddits(
    q: string,
    page: number,
    limit: number,
  ) {
    return this.prisma.subreddit.findMany({
      where: {
        OR: [
          {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          },

          {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },

          {
            description: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      },

      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        memberCount: true,
        
      },

      orderBy: {
        memberCount: 'desc',
      },

      skip:
        (page - 1) * limit,

      take: limit,
    });
  }
}