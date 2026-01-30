import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      select: { groupId: true, expiresAt: true },
    });

    // Check if token is valid or is expired
    if (!invite) throw new BadRequestException({
      error: 'INVALID_INVITE_TOKEN', 
      message: 'Invalid invite token'
    });

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException({
        error: 'INVALID_INVITE_TOKEN', 
        message: 'Invite token has expired'
      });
    }

    // Check if already a member
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: invite.groupId, userId } },
      select: { id: true },
    });

    if (existing) {
      throw new ForbiddenException({
        error: 'INVALID_ROLE',
        message: 'User is already a member or owner of this group'
      });
    }

    // Create membership
    await this.prisma.groupMember.create({
      data: { groupId: invite.groupId, userId, role: 'MEMBER' },
    });

    // Increment uses (optional)
    await this.prisma.groupInvite.update({
      where: { token },
      data: { uses: { increment: 1 } },
    });

    return { ok: true, groupId: invite.groupId };
  }
}
