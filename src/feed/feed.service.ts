import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ListFeedDto } from './dto/list-feed.dto';
import { FeedPostResponseDto } from './dto/feed-post-response.dto';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly feedSelection: Prisma.PostSelect = {
    id: true,
    title: true,
    content: true,
    score: true,
    commentCount: true,
    createdAt: true,
    author: { select: { username: true, displayName: true, avatarUrl: true } },
    subreddit: { select: { id: true, name: true, title: true } },
  };

  async findFeed(query: ListFeedDto) {
    const strategy: Record<string, (q: ListFeedDto) => Promise<any>> = {
      new: (q) => this.getStandardFeed(q, { createdAt: 'desc' }),
      top: (q) => this.getStandardFeed(q, { score: 'desc' }),
      hot: (q) => this.getHotFeed(q),
    };

    const runStrategy = strategy[query.sort] || strategy.hot;
    return runStrategy(query);
  }

  private async getStandardFeed(query: ListFeedDto, orderBy: Prisma.PostOrderByWithRelationInput) {
    const { page = 1, limit = 10 } = query;
    const where = this.buildWhereClause(query);

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        select: this.feedSelection,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      feed: posts as unknown as FeedPostResponseDto[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getHotFeed(query: ListFeedDto) {
    const { page = 1, limit = 10 } = query;
    const where = this.buildWhereClause(query);

    // Fetching capped maximum sample sizes handles hot calculations with minimal runtime degradation
    const posts = await this.prisma.post.findMany({
      where,
      select: this.feedSelection,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const now = Date.now();
    const rankedPosts = posts
      .map((post) => ({
        post,
        hotScore: post.score / Math.pow(((now - new Date(post.createdAt).getTime()) / 3600000) + 2, 1.5),
      }))
      .sort((a, b) => b.hotScore - a.hotScore);

    const paginatedItems = rankedPosts
      .slice((page - 1) * limit, page * limit)
      .map((item) => item.post);

    return {
      feed: paginatedItems as unknown as FeedPostResponseDto[],
      pagination: {
        page,
        limit,
        total: rankedPosts.length,
        totalPages: Math.ceil(rankedPosts.length / limit),
      },
    };
  }

  private buildWhereClause(query: ListFeedDto): Prisma.PostWhereInput {
    const where: Prisma.PostWhereInput = { deletedAt: null };

    if (query.sort === 'top' && query.time && query.time !== 'all') {
      const timeOffsets: Record<string, number> = {
        hour: 3600000,
        day: 86400000,
        week: 604800000,
        month: 2592000000,
        year: 31536000000,
      };

      const offset = timeOffsets[query.time];
      if (offset) {
        where.createdAt = { gte: new Date(Date.now() - offset) };
      }
    }

    return where;
  }
}