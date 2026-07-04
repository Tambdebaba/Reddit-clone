import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubredditDto } from './dto/create-subreddit.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListSubredditsDto } from './dto/list-subreddits.dto';
import { ListPostsDto } from '../post/dto/list-posts.dto';
import { ListMembersDto } from './dto/list-members.dto';
@Injectable()
export class SubredditService {
  constructor(private readonly prisma: PrismaService,){}
  async create(dto: CreateSubredditDto, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
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
  
        return {
          id: subreddit.id,
          name: subreddit.name,
          title: subreddit.title,
          description: subreddit.description,
          memberCount: subreddit.memberCount,
          createdAt: subreddit.createdAt,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Subreddit name already exists',
        );
      }
  
      throw error;
    }
  }
  async findOne(name: string) {
    const subreddit =
      await this.prisma.subreddit.findUnique({
        where: {
          name,
        },
  
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
  
          _count: {
            select: {
              posts: true,
              memberships: true,
            },
          },
        },
      });
  
    if (!subreddit) {
      throw new NotFoundException(
        'Subreddit not found',
      );
    }
  
    return {
      id: subreddit.id,
      name: subreddit.name,
      title: subreddit.title,
      description: subreddit.description,
      rules: subreddit.rules,
      bannerUrl: subreddit.bannerUrl,
      isNsfw: subreddit.isNsfw,
      createdAt: subreddit.createdAt,
  
      creator: subreddit.creator,
  
      memberCount:
        subreddit._count.memberships,
  
      postCount:
        subreddit._count.posts,
    };
  }
  async findAll(
    query: ListSubredditsDto,
  ) {
    const { page, limit } = query;
  
    const skip = (page - 1) * limit;
  
    const subreddits =
      await this.prisma.subreddit.findMany({
        skip,
        take: limit,
        orderBy: {
          memberCount: 'desc',
        },
        select: {
          id: true,
          name: true,
          title: true,
          description: true,
          bannerUrl: true,
          memberCount: true,
          isNsfw: true,
          createdAt: true,
        },
      });
  
    const total =
      await this.prisma.subreddit.count();
  
    const totalPages =
      Math.ceil(total / limit);
  
    return {
      data: subreddits,
  
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
  async join(
    subredditName: string,
    userId: string,
  ) {
    // 1. Find the subreddit
    const subreddit = await this.prisma.subreddit.findUnique({
      where: {
        name: subredditName,
      },
    });
  
    // 2. Ensure it exists
    if (!subreddit) {
      throw new NotFoundException('Subreddit not found');
    }
  
    // 3. Check if the user is already a member
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_subredditId: {
          userId,
          subredditId: subreddit.id,
        },
      },
    });
  
    if (membership) {
      throw new BadRequestException(
        'You have already joined this subreddit',
      );
    }
  
    // 4. Create membership and increment member count atomically
    await this.prisma.$transaction([
      this.prisma.membership.create({
        data: {
          userId,
          subredditId: subreddit.id,
        },
      }),
  
      this.prisma.subreddit.update({
        where: {
          id: subreddit.id,
        },
        data: {
          memberCount: {
            increment: 1,
          },
        },
      }),
    ]);
  
    // 5. Return a success response
    return {
      message: 'Successfully joined subreddit',
    };
  }
  async leave(
    subredditName: string,
    userId: string,
  ) {
    // Find subreddit
    const subreddit = await this.prisma.subreddit.findUnique({
      where: {
        name: subredditName,
      },
    });
  
    if (!subreddit) {
      throw new NotFoundException(
        'Subreddit not found',
      );
    }
  
    // Check membership
    const membership =
      await this.prisma.membership.findUnique({
        where: {
          userId_subredditId: {
            userId,
            subredditId: subreddit.id,
          },
        },
      });
  
    if (!membership) {
      throw new BadRequestException(
        'You are not a member of this subreddit',
      );
    }
  
    // Prevent creator/moderator from leaving
    if (membership.role === 'MODERATOR') {
      throw new BadRequestException(
        'Moderator cannot leave the subreddit',
      );
    }
  
    // Transaction
    await this.prisma.$transaction([
      this.prisma.membership.delete({
        where: {
          userId_subredditId: {
            userId,
            subredditId: subreddit.id,
          },
        },
      }),
  
      this.prisma.subreddit.update({
        where: {
          id: subreddit.id,
        },
        data: {
          memberCount: {
            decrement: 1,
          },
        },
      }),
    ]);
  
    return {
      message: 'Successfully left subreddit',
    };
  }
  async findPosts(
    name: string,
    query: ListPostsDto,  
  ) {
    const {
      page,
      limit,
    } = query;
  
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
  
    const where = {
      subredditId: subreddit.id,
      deletedAt: null,
    };
  
    const [posts, total] =
      await this.prisma.$transaction([
        this.prisma.post.findMany({
          where,
  
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
  
          orderBy: {
            createdAt: 'desc',
          },
  
          skip:
            (page - 1) * limit,
  
          take: limit,
        }),
  
        this.prisma.post.count({
          where,
        }),
      ]);
  
    return {
      posts,
  
      pagination: {
        page,
        limit,
        total,
  
        totalPages: Math.ceil(
          total / limit,
        ),
  
        hasNextPage:
          page <
          Math.ceil(total / limit),
  
        hasPreviousPage:
          page > 1,
      },
    };
  }
  async findMembers(
    name: string,
    query: ListMembersDto,
  ) {
    const {
      page,
      limit,
    } = query;
  
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
  
    const where = {
      subredditId: subreddit.id,
    };
  
    const [members, total] =
      await this.prisma.$transaction([
        this.prisma.membership.findMany({
          where,
  
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
  
          orderBy: {
            joinedAt: 'asc',
          },
  
          skip:
            (page - 1) * limit,
  
          take: limit,
        }),
  
        this.prisma.membership.count({
          where,
        }),
      ]);
  
    return {
      members: members.map(
        (member) => ({
          id: member.user.id,
          username:
            member.user.username,
          displayName:
            member.user.displayName,
          avatarUrl:
            member.user.avatarUrl,
          role: member.role,
          joinedAt:
            member.joinedAt,
        }),
      ),
  
      pagination: {
        page,
        limit,
        total,
  
        totalPages: Math.ceil(
          total / limit,
        ),
  
        hasNextPage:
          page <
          Math.ceil(total / limit),
  
        hasPreviousPage:
          page > 1,
      },
    };
  }
  async findJoined(
    userId: string,
  ) {
    const memberships =
      await this.prisma.membership.findMany({
        where: {
          userId,
        },
  
        include: {
          subreddit: {
            select: {
              id: true,
              name: true,
              title: true,
              description: true,
              bannerUrl: true,
              memberCount: true,
              isNsfw: true,
            },
          },
        },
  
        orderBy: {
          subreddit: {
            memberCount: 'desc',
          },
        },
      });
  
    return memberships.map(
      (membership) => ({
        role: membership.role,
  
        subreddit:
          membership.subreddit,
      }),
    );
  }
}