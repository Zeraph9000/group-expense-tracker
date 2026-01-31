import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSettlement(params: {
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amountCents: number;
    currency: string;
    note?: string;
  }) {
    const { groupId, fromUserId, toUserId, amountCents, currency, note } = params;

    if (fromUserId === toUserId) {
      throw new BadRequestException({
        error: 'INVALID_SETTLEMENT',
        message: 'Cannot settle with yourself',
      });
    }

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new BadRequestException({
        error: 'INVALID_SETTLEMENT',
        message: 'amountCents must be a positive integer',
      });
    }

    // Validate both users are members of group
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { in: [fromUserId, toUserId] } },
      select: { userId: true },
    });

    if (members.length !== 2) {
      throw new BadRequestException({
        error: 'INVALID_SETTLEMENT',
        message: 'Both users must be members of the group',
      });
    }

    const settlement = await this.prisma.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amountCents,
        currency,
        note: note?.trim() || null,
      },
      select: {
        id: true,
        groupId: true,
        fromUserId: true,
        toUserId: true,
        amountCents: true,
        currency: true,
        note: true,
        createdAt: true,
      },
    });

    return settlement;
  }

  async listSettlements(groupId: string) {
    return this.prisma.settlement.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amountCents: true,
        currency: true,
        note: true,
        createdAt: true,
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
