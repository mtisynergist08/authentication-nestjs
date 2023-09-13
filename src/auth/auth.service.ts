import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { env } from '../utils/validate-path';
import { Request, Response } from 'express';

interface SignUpParams {
  username: string;
  email: string;
  password: string;
}

interface SignInParams {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(body: SignUpParams) {
    const { username, email, password } = body;

    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('email already exists');
    }

    // const passwordHash = await bcrypt.hash(password, 10);

    const passwordHash = await this.hashPassword(password);

    await this.prismaService.user.create({
      data: {
        username: username,
        email: email,
        hashedPassword: passwordHash,
      },
    });

    return { message: 'sign up successful' };
  }

  async signin(body: SignInParams, req: Request, res: Response) {
    const { email, password } = body;

    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      throw new NotFoundException('user not found');
    }

    const isMatch = await this.comparePassword({
      password,
      hashedPassword: existingUser.hashedPassword,
    });

    if (!isMatch) {
      throw new BadRequestException('wrong password');
    }

    // sign in token

    const access_Token = await this.generateToken({
      id: existingUser.id,
      username: existingUser.username,
      email: existingUser.email,
    });

    if (!access_Token) {
      throw new ForbiddenException('token not found');
    }

    res.cookie('access_Token', access_Token, {
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    return res.send({ message: 'sign in successful' });
  }

  async signout(req: Request, res: Response) {
    res.cookie('access_Token', '', {
      httpOnly: true,
      expires: new Date(0),
    });
    return res.send({ message: 'sign out successful' });
  }

  private async hashPassword(password: string) {
    return bcrypt.hashSync(password, 10);
  }

  private async comparePassword(args: {
    password: string;
    hashedPassword: string;
  }) {
    return bcrypt.compareSync(args.password, args.hashedPassword);
  }

  private async generateToken(args: {
    id: string;
    username: string;
    email: string;
  }) {
    return this.jwtService.sign(
      {
        id: args.id,
        username: args.username,
        email: args.email,
      },
      {
        expiresIn: '1hr',
        secret: env.JWT_SECRET,
      },
    );
  }
}
