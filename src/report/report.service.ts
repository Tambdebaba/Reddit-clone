import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { PrismaService } from '../prisma/prisma.service';
  
  import { CreateReportDto } from './dto/create-report.dto';
  
  import { ReportStatus } from '@prisma/client';
  
  @Injectable()
  export class ReportService {
    constructor(
      private readonly prisma: PrismaService,
    ) {}
  
    async create(
      dto: CreateReportDto,
      reporterId: string,
    ) {
      const targets = [
        dto.postId,
        dto.commentId,
        dto.reportedUserId,
      ].filter(Boolean);
  
      if (targets.length !== 1) {
        throw new BadRequestException(
          'Exactly one target must be provided.',
        );
      }
  
      // Report Post
      if (dto.postId) {
        const post =
          await this.prisma.post.findUnique({
            where: {
              id: dto.postId,
            },
          });
  
        if (!post || post.deletedAt) {
          throw new NotFoundException(
            'Post not found',
          );
        }
  
        if (post.authorId === reporterId) {
          throw new BadRequestException(
            'You cannot report your own post.',
          );
        }
  
        const existing =
          await this.prisma.report.findFirst({
            where: {
              reporterId,
              postId: dto.postId,
            },
          });
  
        if (existing) {
          throw new BadRequestException(
            'You already reported this post.',
          );
        }
  
        return this.prisma.report.create({
          data: {
            reporterId,
            postId: dto.postId,
            reason: dto.reason,
            description: dto.description,
          },
        });
      }
  
      // Report Comment
      if (dto.commentId) {
        const comment =
          await this.prisma.comment.findUnique({
            where: {
              id: dto.commentId,
            },
          });
  
        if (
          !comment ||
          comment.deletedAt
        ) {
          throw new NotFoundException(
            'Comment not found',
          );
        }
  
        if (
          comment.authorId === reporterId
        ) {
          throw new BadRequestException(
            'You cannot report your own comment.',
          );
        }
  
        const existing =
          await this.prisma.report.findFirst({
            where: {
              reporterId,
              commentId: dto.commentId,
            },
          });
  
        if (existing) {
          throw new BadRequestException(
            'You already reported this comment.',
          );
        }
  
        return this.prisma.report.create({
          data: {
            reporterId,
            commentId: dto.commentId,
            reason: dto.reason,
            description: dto.description,
          },
        });
      }
  
      // Report User
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.reportedUserId,
          },
        });
  
      if (!user) {
        throw new NotFoundException(
          'User not found',
        );
      }
  
      if (user.id === reporterId) {
        throw new BadRequestException(
          'You cannot report yourself.',
        );
      }
  
      const existing =
        await this.prisma.report.findFirst({
          where: {
            reporterId,
            reportedUserId:
              dto.reportedUserId,
          },
        });
  
      if (existing) {
        throw new BadRequestException(
          'You already reported this user.',
        );
      }
  
      return this.prisma.report.create({
        data: {
          reporterId,
          reportedUserId:
            dto.reportedUserId,
          reason: dto.reason,
          description: dto.description,
        },
      });
    }
  
    async findAll() {
      return this.prisma.report.findMany({
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
            },
          },
  
          reportedUser: {
            select: {
              id: true,
              username: true,
            },
          },
  
          post: {
            select: {
              id: true,
              title: true,
            },
          },
  
          comment: {
            select: {
              id: true,
              body: true,
            },
          },
        },
  
        orderBy: {
          createdAt: 'desc',
        },
      });
    }
  
    async findOne(id: string) {
      const report =
        await this.prisma.report.findUnique({
          where: {
            id,
          },
  
          include: {
            reporter: true,
            reportedUser: true,
            post: true,
            comment: true,
          },
        });
  
      if (!report) {
        throw new NotFoundException(
          'Report not found',
        );
      }
  
      return report;
    }
  
    async resolve(id: string) {
      await this.ensureExists(id);
  
      return this.prisma.report.update({
        where: {
          id,
        },
  
        data: {
          status:
            ReportStatus.REVIEWED,
        },
      });
    }
  
    async dismiss(id: string) {
      await this.ensureExists(id);
  
      return this.prisma.report.update({
        where: {
          id,
        },
  
        data: {
          status:
            ReportStatus.DISMISSED,
        },
      });
    }
  
    private async ensureExists(
      id: string,
    ) {
      const report =
        await this.prisma.report.findUnique({
          where: {
            id,
          },
        });
  
      if (!report) {
        throw new NotFoundException(
          'Report not found',
        );
      }
  
      return report;
    }
  }