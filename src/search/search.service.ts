import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchDto) {
    const { q, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    // Parallel execution across non-blocking connections via Promise.all
    const [posts, users, subreddits] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          score: true,
          commentCount: true,
          createdAt: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.subreddit.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          title: true,
          memberCount: true,
        },
        skip,
        take: limit,
      }),
    ]);

    return { posts, users, subreddits };
  }
}