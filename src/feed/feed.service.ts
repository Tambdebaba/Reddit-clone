
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ListFeedDto } from './dto/list-feed.dto';
import { FeedPostResponseDto } from './dto/feed-post-response.dto';
@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findFeed(
    query: ListFeedDto,
  ) {
    switch (query.sort) {
      case 'new':
        return this.getNewFeed(query);

      case 'top':
        return this.getTopFeed(query);

      case 'hot':
      default:
        return this.getHotFeed(query);
    }
  }
  private async getNewFeed(
    query: ListFeedDto,
  ) {
    return this.getFeed(
      query,
      {
        createdAt: 'desc',
      },
    );
  }

  private async getTopFeed(
    query: ListFeedDto,
  ) {
    return this.getFeed(
      query,
      {
        score: 'desc',
      },
    );
  }

  private async getHotFeed(
    query: ListFeedDto,
  ) {
    const {
      page,
      limit,
    } = query;

    const where =
      this.buildWhereClause(
        query,
      );

    const posts =
      await this.prisma.post.findMany({
        where,

        include:
          this.postInclude,

        orderBy: {
          createdAt: 'desc',
        },

        take: 100,
      });

    const rankedPosts = posts
      .map((post) => ({
        post,

        hotScore:
          this.calculateHotScore(
            post,
          ),
      }))
      .sort(
        (a, b) =>
          b.hotScore -
          a.hotScore,
      );

    const paginated =
      rankedPosts
        .slice(
          (page - 1) *
            limit,
          page * limit,
        )
        .map(
          (item) =>
            item.post,
        );

    return {
      feed:
        this.mapFeedResponse(
          paginated,
        ),

      pagination: {
        page,
        limit,

        total:
          rankedPosts.length,

        totalPages:
          Math.ceil(
            rankedPosts.length /
              limit,
          ),
      },
    };
  }


  private async getFeed(
    query: ListFeedDto,
    orderBy:
      Prisma.PostOrderByWithRelationInput,
  ) {
    const {
      page,
      limit,
    } = query;

    const where =
      this.buildWhereClause(
        query,
      );

    const [
      posts,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.post.findMany({
          where,

          include:
            this.postInclude,

          orderBy,

          skip:
            (page - 1) *
            limit,

          take: limit,
        }),

        this.prisma.post.count({
          where,
        }),
      ]);

    return {
      feed:
        this.mapFeedResponse(
          posts,
        ),

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total /
              limit,
          ),
      },
    };
  }

  private buildWhereClause(
    query: ListFeedDto,
  ): Prisma.PostWhereInput {
    const where: Prisma.PostWhereInput =
      {
        deletedAt: null,
      };

    if (
      query.sort ===
        'top' &&
      query.time !== 'all'
    ) {
      const startDate =
        this.getStartDate(
          query.time,
        );

      if (startDate) {
        where.createdAt = {
          gte: startDate,
        };
      }
    }

    return where;
  }

  private getStartDate(
    time:| 'hour'| 'day'| 'week'| 'month'| 'year'| 'all',
  ): Date | null {
    const now =
      new Date();

    switch (time) {
      case 'hour':
        return new Date(now.getTime() -60 *60 *1000); 
      case 'day':
        return new Date(now.getTime() -24 *60 *60 *1000,);
      case 'week':
        return new Date(now.getTime() -7 *24 *60 *60 *1000,);
      case 'month':
        return new Date(now.getTime() -30 *24*60 *60 *1000,);   
      case 'year':
        return new Date(now.getTime() -365 *24 *60 *60 *1000);    
      default:
        return null;
    }
  }

  private calculateHotScore(
    post: any,
  ) {
    const now =
      Date.now();

    const created =
      new Date(
        post.createdAt,
      ).getTime();

    const hoursOld =
      (now - created) /
      (1000 *60 *60);

    return (
      post.score /
      Math.pow(
        hoursOld + 2,
        1.5,
      )
    );
  }

  private readonly postInclude = {
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
  };

  private mapFeedResponse(
    posts: any[],
  ): FeedPostResponseDto[] {
    return posts.map(
      (post) => ({
        id: post.id,

        title:
          post.title,

        content:
          post.content,

        score:
          post.score,

        commentCount:
          post.commentCount,

        createdAt:
          post.createdAt,

        author: {
          username:
            post.author
              .username,

          displayName:
            post.author
              .displayName,

          avatarUrl:
            post.author
              .avatarUrl,
        },

        subreddit: {
          id: post
            .subreddit.id,

          name: post
            .subreddit
            .name,

          title:
            post
              .subreddit
              .title,
        },
      }),
    );
  }
}

