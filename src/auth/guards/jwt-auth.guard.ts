import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  
  @Injectable()
  export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
      console.log('JwtAuthGuard canActivate called');
      return super.canActivate(context);
    }
  
    handleRequest(err: any, user: any, info: any) {
      console.log('===== Passport Result =====');
      console.log('Error:', err);
      console.log('User:', user);
      console.log('Info:', info);
  
      if (err || !user) {
        throw err || new UnauthorizedException(info?.message);
      }
  
      return user;
    }
  }