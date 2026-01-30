import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { GROUP_ROLES_KEY } from '../decorators/group-role.decorator';
import { GroupRole } from '@prisma/client';

@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const user = (req as any).user as { id: string } | undefined;
    if (!user) {
      // AuthGuard should have run before this
      throw new ForbiddenException('Missing user context');
    }

    const groupId = (req.params as any)?.groupId as string | undefined;
    if (!groupId) {
      throw new ForbiddenException('Missing groupId param');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException({
        error: 'INVALID_GROUP_ID',
        message: 'User is not the owner or creator of the group'
      });
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<GroupRole[]>(GROUP_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    // If no required roles specified, membership is enough
    if (requiredRoles.length === 0) return true;

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role for this action');
    }

    return true;
  }
}
