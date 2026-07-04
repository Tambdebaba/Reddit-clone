import {
    Controller,
    Get,
    Param,
    Patch,
    UseGuards,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../auth/decorators/current-user.decorator';
  import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
  
  import { NotificationService } from './notification.service';
  
  @Controller('notifications')
  @UseGuards(JwtAuthGuard)
  export class NotificationController {
    constructor(
      private readonly prisma: PrismaService,
      private readonly notificationService: NotificationService,
    ) {}
  
    @Get()
    findAll(
      @CurrentUser() user: JwtPayload,
    ) {
      return this.notificationService.findAll(
        user.sub,
      );
    }
  
    @Patch(':id/read')
    markAsRead(
      @Param('id') id: string,
      @CurrentUser() user: JwtPayload,
    ) {
      return this.notificationService.markAsRead(
        id,
        user.sub,
      );
    }
  
    @Patch('read-all')
    markAllAsRead(
      @CurrentUser() user: JwtPayload,
    ) {
      return this.notificationService.markAllAsRead(
        user.sub,
      );
    }
  }