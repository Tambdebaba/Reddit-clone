import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterDto } from '../auth/dto/register.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import  type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUserContentDto } from './dto/list-user-content.dto';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() registerDto: RegisterDto) {
    return this.usersService.create(registerDto);
  }
  @Get('me')
  getMe(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.findMe(user.sub);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      user.sub,
      dto,
    );
  }
  @Get(':username')
  findProfile(
    @Param('username') username: string,
  ) {
    return this.usersService.findProfile(
      username,
    );
  }
  @Get(':username/posts')
  findPosts(
    @Param('username') username: string,
    @Query() query: ListUserContentDto,
  ) {
    return this.usersService.findUserPosts(
      username,
      query,
    );
  }
  
  @Get(':username/comments')
  findComments(
    @Param('username') username: string,
    @Query() query: ListUserContentDto,
  ) {
    return this.usersService.findUserComments(
      username,
      query,
    );
  }
}