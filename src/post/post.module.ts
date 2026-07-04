import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
@Module({ 
    imports: [PrismaModule,NotificationModule,],
    controllers: [PostController],
    providers: [PostService],
})
export class PostModule {}
