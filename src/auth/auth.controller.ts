import { Body, Controller, Post } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UseGuards, Request, Get } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from './decorators/current-user.decorator';
@Controller('auth') 
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return req.user;
  }
  @Post('register')
  register(
    @Body() registerDto: RegisterDto,
  ) {
    return this.authService.register(
      registerDto,
    );
  }
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  @Post('refresh')
    refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    ) {
      return this.authService.refresh(
      refreshTokenDto,
    );
  }
  @Post('logout')
  logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ){
      
    return this.authService.logout(
      refreshTokenDto,
    );
  };
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
  @CurrentUser() user: {
    sub: string;
    email: string;
  },
  ) {
  return this.authService.me(user.sub);
  }
 
}
