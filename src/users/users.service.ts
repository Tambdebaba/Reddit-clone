
import {Injectable,NotFoundException,} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { ListUserContentDto } from './dto/list-user-content.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async create(registerDto: RegisterDto) {
    return this.prisma.user.create({
      data: {
        username: registerDto.username,
        email: registerDto.email,
        passwordHash: registerDto.password,
      },
    });
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        gender: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const exists = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!exists) {
      throw new NotFoundException('User not found');
    }

    const updatedUser =
      await this.prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          ...(dto.displayName !== undefined && {
            displayName: dto.displayName,
          }),

          ...(dto.bio !== undefined && {
            bio: dto.bio,
          }),

          ...(dto.avatarUrl !== undefined && {
            avatarUrl: dto.avatarUrl,
          }),

          ...(dto.gender !== undefined && {
            gender: dto.gender,
          }),
        },

        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          gender: true,
          status: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  async findProfile(
    username: string,
  ): Promise<UserProfileResponseDto> {
    const user =
      await this.prisma.user.findUnique({
        where: {
          username,
        },

        include: {
          _count: {
            select: {
              posts: true,
              comments: true,
            },
          },

          posts: {
            where: {
              deletedAt: null,
            },

            select: {
              score: true,
            },
          },

          comments: {
            where: {
              deletedAt: null,
            },

            select: {
              score: true,
            },
          },
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    const postKarma = user.posts.reduce(
      (sum, post) => sum + post.score,
      0,
    );

    const commentKarma =
      user.comments.reduce(
        (sum, comment) =>
          sum + comment.score,
        0,
      );

    const karma =
      postKarma + commentKarma;

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      createdAt: user.createdAt,
      karma,
      postCount: user._count.posts,
      commentCount: user._count.comments,
    };
  }
  async findUserPosts(
    username: string,
    query: ListUserContentDto,
  ){
    const user =await this.prisma.user.findUnique({
      where: {
        username,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const posts =await this.prisma.post.findMany({
      where: {
        authorId: user.id,
        deletedAt: null,
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    const total =await this.prisma.post.count({
  
      where: {
        authorId: user.id,
        deletedAt: null,
      },
    });
    return {
      posts,
    
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(
          total / query.limit,
        ),
      },
    };
  }
  async findUserComments(
    username: string,
    query: ListUserContentDto,
  ){
    const user =await this.prisma.user.findUnique({
      where: {
        username,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const comments =await this.prisma.comment.findMany({
  
    where: {
      authorId: user.id,
      deletedAt: null,
    },

    include: {
      post: {
        select: {
          id: true,
          title: true,
        },
      },

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
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });
    const total =await this.prisma.comment.count({
  
      where: {
        authorId: user.id,
        deletedAt: null,
      },
    });
    return {
      comments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
