import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from 'src/auth/dto/register.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }
  async create(registerDto: RegisterDto) {
    return this.prisma.user.create({
      data: {
        username: registerDto.username,
        email: registerDto.email,
        passwordHash: registerDto.password,
      },
    });
  }
}