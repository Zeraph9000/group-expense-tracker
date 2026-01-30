import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private sessionTtlDays(): number {
    const raw = this.config.get<string>('SESSION_TTL_DAYS') ?? '30';
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 30;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    // Check if email is already in use
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) { 
      throw new BadRequestException({
        error: 'INVALID_EMAIL',
        message: 'Email already in use',
      });
    }

    // Hash password and create user
    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        name: dto.name?.trim() || null,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return { id: user.id };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    // Check if the email given is used by a user
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException({
        error: 'INVALID_CREDENTIALS',
        message: 'Email does not exists',
      });
    }

    // Check if the password given matches
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new BadRequestException({
        error: 'INVALID_CREDENTIALS',
        message: 'Wrong password given',
      });
    }

    const expiresAt = new Date(Date.now() + this.sessionTtlDays() * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: { userId: user.id, expiresAt },
      select: { id: true, expiresAt: true },
    });

    return { user: { id: user.id, email: user.email, name: user.name }, session };
  }

  async logout(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
    return {};
  }

  async getUserForSession(sessionId: string) {
    const now = new Date();

    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, expiresAt: { gt: now } },
      include: { user: true },
    });

    if (!session) return null;

    return {
      sessionId: session.id,
      user: { id: session.user.id, email: session.user.email, name: session.user.name },
    };
  }
}
