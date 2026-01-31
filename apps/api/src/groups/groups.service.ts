import { ForbiddenException, Get, Injectable, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { ExpensesService } from '../expenses/expenses.service';
import { GroupAuth } from './decorators/group-auth.decorator';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expensesService: ExpensesService
  ) {}

  async createGroup(userId: string, name: string) {
    const trimmed = name.trim();

    // Create group + membership in one transaction
    const group = await this.prisma.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: {
          name: trimmed,
          createdById: userId,
          members: {
            create: {
              userId,
              role: 'OWNER',
            },
          },
        },
        select: { id: true, name: true, createdAt: true },
      });

      return g;
    });

    return group;
  }

  async listMyGroups(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: {
        role: true,
        group: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      role: m.role,
      ...m.group,
    }));
  }

  async createInvite(groupId: string, createdById: string) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new ForbiddenException({
        error: 'INVALID_GROUP_ID',
        message: 'Invalid group id is given'
      });
    }

    const token = randomBytes(24).toString('hex'); // 48 chars
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week (MVP)

    const invite = await this.prisma.groupInvite.create({
      data: {
        groupId,
        token,
        createdById,
        expiresAt,
      },
      select: { token: true, expiresAt: true },
    });

    return invite;
  }

  @GroupAuth()
  @Get(':groupId/settle/suggestions')
  async settleSuggestions(@Param('groupId') groupId: string) {
    return this.expensesService.getSettleUpPlan(groupId);
  }

}
