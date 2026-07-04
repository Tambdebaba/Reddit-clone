import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUserContentDto } from './dto/list-user-content.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user || user.status === 'DELETED') throw new NotFoundException('Profile not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true },
    });
  }

  async findUserPosts(username: string, query: ListUserContentDto) {
    const { page = 1, limit = 10 } = query;
    
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId: user.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where: { authorId: user.id, deletedAt: null } }),
    ]);

    return { posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findUserComments(username: string, query: ListUserContentDto) {
    const { page = 1, limit = 10 } = query;

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { authorId: user.id, deletedAt: null },
        include: { post: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comment.count({ where: { authorId: user.id, deletedAt: null } }),
    ]);

    return { comments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}