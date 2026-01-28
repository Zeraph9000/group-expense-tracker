import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieName() {
    return this.config.get<string>('COOKIE_NAME') ?? 'sid';
  }

  private cookieSecure() {
    return (this.config.get<string>('COOKIE_SECURE') ?? 'false') === 'true';
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user and create session' })
  @ApiResponse({ status: 200, description: 'Login successful, session cookie set' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, session } = await this.auth.login(dto);

    res.cookie(this.cookieName(), session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookieSecure(),
      path: '/',
    });

    return { user, expiresAt: session.expiresAt };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user and destroy session' })
  @ApiCookieAuth('sid')
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[this.cookieName()];
    if (sid) await this.auth.logout(sid);

    res.clearCookie(this.cookieName(), { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiCookieAuth('sid')
  @ApiResponse({ status: 200, description: 'Returns current user or null' })
  async me(@Req() req: Request) {
    const sid = req.cookies?.[this.cookieName()];
    if (!sid) return { user: null };

    const result = await this.auth.getUserForSession(sid);
    return { user: result?.user ?? null };
  }
}
