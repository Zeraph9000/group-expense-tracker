import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
