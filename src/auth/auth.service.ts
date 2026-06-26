import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { Prisma } from '@prisma/client'; // ⚡ Required to catch Prisma error types
import { randomUUID } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash} from 'crypto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService,private jwtService: JwtService,) {}
    
    async register(registerDto: RegisterDto) {
        // 1. Hash the password first
      const hashedPassword = await bcrypt.hash(
        registerDto.password,
        10,
      );

      try{
            // 2. Attempt to create the user immediately (saves a DB round-trip)
        const user = await this.prisma.user.create({
          data: {
            id: randomUUID() ,
            username: registerDto.username,
            email: registerDto.email,
            passwordHash: hashedPassword,
          },
        });

            // 3. Return sanitized user data if creation succeeds
        return {
          id: user.id,
          username: user.username,
          email: user.email,
        };
            
      }
      catch (error) {
            // 4. Intercept unique constraint violations (Error Code P2002)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError && 
          error.code === 'P2002'
        ) {
          throw new BadRequestException('Email or username already exists');
        }

            // 5. Throw any other unexpected database or connection errors
        throw error;
      }
    }
    private async generateAccessToken(userId: string,email: string,){
      return this.jwtService.signAsync({sub: userId,email,});
    }

    private async generateRefreshToken(userId: string) {
      const refreshToken = randomBytes(64).toString('hex');
    
      const tokenHash = createHash('sha256')
        .update(refreshToken)
        .digest('hex');
    
      await this.prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ),
        },
      });
    
      return refreshToken;
    }

    async login(loginDto: LoginDto) {
      const user = await this.prisma.user.findUnique({
        where: {
          email: loginDto.email,
        },
      });
    
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
    
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.passwordHash,
      );
    
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    
      const accessToken = await this.generateAccessToken(
        user.id,
        user.email,
      );
      
      const refreshToken = await this.generateRefreshToken(user.id); 
      return { accessToken, refreshToken, };
    }


    async refresh(refreshTokenDto: RefreshTokenDto,){
      const tokenHash = createHash('sha256')
        .update(refreshTokenDto.refreshToken)
        .digest('hex');
    
      const session =
        await this.prisma.refreshToken.findUnique({
          where: {
            tokenHash,
          },
          include: {
            user: true,
          },
        });
    
      if (!session) {
        throw new UnauthorizedException(
          'Invalid refresh token',
        );
      }
    
      if (session.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: {
            id: session.id,
          },
        });
    
        throw new UnauthorizedException(
          'Refresh token expired',
        );
      }
    
      await this.prisma.refreshToken.delete({
        where: {
          id: session.id,
        },
      });
    
      const accessToken =
        await this.generateAccessToken(
          session.user.id,
          session.user.email,
        );
    
      const newRefreshToken =
        await this.generateRefreshToken(
          session.user.id,
        );
    
      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    }
    async logout(refreshTokenDto: RefreshTokenDto,){
      const tokenHash = createHash('sha256')
        .update(refreshTokenDto.refreshToken)
        .digest('hex');
    
      await this.prisma.refreshToken.deleteMany({
        where: {
          tokenHash,
        },
      });
    
      return {
        message: 'Logged out successfully',
      };
    }
    async me(userId: string) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
          isEmailVerified: true,
        },
      });
    
      return user;
    }
}

