import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtService } from '@nestjs/jwt';
import { Prisma, VoteType, NotificationType } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    try {
      // Let DB handle automatic UUID defaults to avoid runtime crypto initialization blockers
      return await this.prisma.user.create({
        data: {
          username: registerDto.username,
          email: registerDto.email,
          passwordHash: hashedPassword,
        },
        select: {
          id: true,
          username: true,
          email: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Email or username already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: loginDto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user.id, user.email),
      this.generateRefreshToken(user.id),
    ]);

    return { accessToken, refreshToken };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = createHash('sha256').update(refreshTokenDto.refreshToken).digest('hex');

    try {
      // Deleting directly skips a redundant select/query roundtrip entirely.
      const session = await this.prisma.refreshToken.delete({
        where: { tokenHash },
        include: { user: { select: { id: true, email: true } } },
      });

      if (session.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const [accessToken, newRefreshToken] = await Promise.all([
        this.generateAccessToken(session.user.id, session.user.email),
        this.generateRefreshToken(session.user.id),
      ]);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      // P2025 is Prisma's error code for "Record to delete does not exist"
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw error;
    }
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = createHash('sha256').update(refreshTokenDto.refreshToken).digest('hex');

    try {
      await this.prisma.refreshToken.delete({ where: { tokenHash } });
    } catch {
      // Silently consume missing records during logout requests to maximize idempotency
    }

    return { message: 'Logged out successfully' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) throw new UnauthorizedException();
    return user;
  }

  private generateAccessToken(userId: string, email: string) {
    return this.jwtService.signAsync({ sub: userId, email });
  }

  private async generateRefreshToken(userId: string) {
    const refreshToken = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 2592000000), // Clean integer representation of 30 days
      },
    });

    return refreshToken;
  }
}