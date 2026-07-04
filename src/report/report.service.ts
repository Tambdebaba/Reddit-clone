import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportStatus } from '@prisma/client';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReportDto, reporterId: string) {
    const targets = [dto.postId, dto.commentId, dto.reportedUserId].filter(Boolean);
    if (targets.length !== 1) {
      throw new BadRequestException('Exactly one target (postId, commentId, or reportedUserId) must be provided.');
    }

    // 1. Post Target Validation
    if (dto.postId) {
      const post = await this.prisma.post.findUnique({ where: { id: dto.postId } });
      if (!post || post.deletedAt) throw new NotFoundException('Post not found');
      if (post.authorId === reporterId) throw new BadRequestException('You cannot report your own post.');
    }

    // 2. Comment Target Validation
    if (dto.commentId) {
      const comment = await this.prisma.comment.findUnique({ where: { id: dto.commentId } });
      if (!comment || comment.deletedAt) throw new NotFoundException('Comment not found');
      if (comment.authorId === reporterId) throw new BadRequestException('You cannot report your own comment.');
    }

    // 3. User Target Validation
    if (dto.reportedUserId) {
      if (dto.reportedUserId === reporterId) throw new BadRequestException('You cannot report yourself.');
      const user = await this.prisma.user.findUnique({ where: { id: dto.reportedUserId } });
      if (!user || user.status === 'DELETED') throw new NotFoundException('User not found');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId: dto.reportedUserId,
        postId: dto.postId,
        commentId: dto.commentId,
        reason: dto.reason,
        description: dto.description,
      },
    });
  }

  async findAll() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
      },
    });
  }

  async resolve(id: string) {
    await this.verifyReportExists(id);
    return this.prisma.report.update({
      where: { id },
      data: { status: ReportStatus.REVIEWED },
    });
  }

  async dismiss(id: string) {
    await this.verifyReportExists(id);
    return this.prisma.report.update({
      where: { id },
      data: { status: ReportStatus.DISMISSED },
    });
  }

  private async verifyReportExists(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
  }
}