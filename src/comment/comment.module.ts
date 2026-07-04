import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    NotificationModule,
  ],
  
  controllers: [CommentController],

  providers: [CommentService],
})
export class CommentModule {}