import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { AuthGuard } from './guards/auth.guard';
import { Auth } from './decorators/auth.decorator';

@ApiTags('auth')
@Controller('v1/auth')
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
  @HttpCode(200)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'cm812abc123' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: `If any of the following are true:
- **INVALID_EMAIL** 
  - Email given is not in a valid format
  - Email has already been used
- **INVALID_PASSWORD** 
  - Password is less than 8 characters
  - Password does not contain at least one letter and one number
- **INVALID_NAME** 
  - Name is less than 2 characters`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
      }
    }
  })
  async register(@Body() dto: RegisterDto) {
    const res = await this.auth.register(dto)
    return res;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login user and create session' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful, session cookie set',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm812abc123' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe', nullable: true }
          }
        },
        expiresAt: { type: 'string', format: 'date-time', example: '2026-02-28T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: `If any of the following are true:
- **INVALID_CREDENTIALS**
  - Email address does not exist
  - Password is not correct for the given email`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
      }
    }
  })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, session } = await this.auth.login(dto);

    const secure = this.cookieSecure();
    res.cookie(this.cookieName(), session.id, {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax', // none required for cross-origin in production
      secure,
      path: '/',
    });

    return { user, expiresAt: session.expiresAt };
  }

  @Post('logout')
  @HttpCode(200)
  @Auth()
  @ApiOperation({ summary: 'Logout user and destroy session' })
  @ApiCookieAuth('cookie')
  @ApiResponse({ 
    status: 200, 
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: `If any of the following are true:
- **INVALID_SESSION**
  - User is not logged in`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
      }
    }
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[this.cookieName()];
    if (sid) await this.auth.logout(sid);

    res.clearCookie(this.cookieName(), { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiCookieAuth('cookie')
  @ApiResponse({ 
    status: 200, 
    description: 'Returns current user or null',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', example: 'cm812abc123' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe', nullable: true }
          }
        }
      }
    }
  })
  async me(@Req() req: Request) {
    const sid = req.cookies?.[this.cookieName()];
    if (!sid) return { user: null };

    const result = await this.auth.getUserForSession(sid);
    return { user: result?.user ?? null };
  }

  @Get('protected')
  @Auth()
  async protected(@Req() req: Request) {
    return { ok: true, user: (req as any).user };
  }
}
