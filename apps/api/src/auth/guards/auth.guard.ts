import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieName = this.config.get<string>('COOKIE_NAME') ?? 'sid';
    const sessionId = request.cookies?.[cookieName];

    if (!sessionId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const result = await this.authService.getUserForSession(sessionId);
    
    if (!result) {
      throw new UnauthorizedException('Invalid session');
    }

    // Attach user to request object
    request.user = result.user;
    
    return true;
  }
}
