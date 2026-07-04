import {
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { NotificationType } from '@prisma/client';
  
  import { PrismaService } from '../prisma/prisma.service';
  
  @Injectable()
  export class NotificationService {
    constructor(
      private readonly prisma: PrismaService,
    ) {}
  
    async createNotification(data: {
      recipientId: string;
      actorId?: string;
      postId?: string;
      commentId?: string;
      type: NotificationType;
      title: string;
      message?: string;
    }) {
      if (
        data.actorId &&
        data.actorId === data.recipientId
      ) {
        return;
      }
  
      return this.prisma.notification.create({
        data: {
          recipientId: data.recipientId,
          actorId: data.actorId,
          postId: data.postId,
          commentId: data.commentId,  
          type: data.type,  
          title: data.title,  
          message: data.message,
        },
      });
    }
  
    async findAll(userId: string) {
      return this.prisma.notification.findMany({
        where: {
          recipientId: userId,
        },
  
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
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
  
    async markAsRead(
      id: string,
      userId: string,
    ) {
      const notification =
        await this.prisma.notification.findFirst({
          where: {
            id,
            recipientId: userId,
          },
        });
  
      if (!notification) {
        throw new NotFoundException(
          'Notification not found',
        );
      }
  
      return this.prisma.notification.update({
        where: {
          id,
        },
  
        data: {
          isRead: true,
        },
      });
    }
  
    async markAllAsRead(
      userId: string,
    ) {
      await this.prisma.notification.updateMany({
        where: {
          recipientId: userId,
  
          isRead: false,
        },
  
        data: {
          isRead: true,
        },
      });
  
      return {
        message:
          'All notifications marked as read',
      };
    }
  }