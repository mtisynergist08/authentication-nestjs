import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request, Response } from 'express';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAllUsers() {
    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    if (!users) {
      throw new NotFoundException('No Users Record found');
    }
    return users;
  }

  async getUser(id: string, req: Request) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const decoded_user = req.user as { id: string; email: string };

    if (user.id !== decoded_user.id) {
      throw new ForbiddenException('Unauthorized');
    }

    return user;
  }
}
