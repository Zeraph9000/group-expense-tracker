import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async createEqualSplitExpense(params: {
    groupId: string;
    createdById: string;
    description: string;
    amountCents: number;
    currency: string;
    paidById: string;
    splitAmongUserIds?: string[]; // optional subset
  }) {
    const {
      groupId,
      createdById,
      description,
      amountCents,
      currency,
      paidById,
      splitAmongUserIds,
    } = params;

    // Checks if description is valid, should already be checked in DTO
    const desc = description.trim();
    if (!desc) throw new BadRequestException({
      error: 'INVALID_DESCRIPTION', 
      message: 'Description is required'
    });

    // Checks if amountCents is valid, should already be checked in DTO
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new BadRequestException({
        error: 'INVALID_EXPENSE', 
        message: 'Expense must be a positive integer'
      });
    }

    // Fetch all group members (used for validation + default split)
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (members.length === 0) {
      throw new ForbiddenException({
        error: 'INVALID_GROUP_ID',
        message: 'Group not found or has no members'
      });
    }

    const memberIdSet = new Set(members.map((m) => m.userId));

    // paidBy must be a member (MVP safety)
    if (!memberIdSet.has(paidById)) {
      throw new BadRequestException({
        error: 'INVALID_USER_ID',
        message: 'Expense was not paid by a member of the group'
      });    
    }

    // Decide who we split among
    let splitUserIds: string[];

    if (!splitAmongUserIds || splitAmongUserIds.length === 0) {
      // default: all members
      splitUserIds = members.map((m) => m.userId);
    } else {
      // normalize + de-duplicate
      const unique = Array.from(new Set(splitAmongUserIds));

      // validate membership
      const invalid = unique.filter((id) => !memberIdSet.has(id));
      if (invalid.length > 0) {
        throw new BadRequestException({
          error: 'INVALID_USER_ID',
          message: 'Expense split contains non-member userId(s)'
        });  
      }

      splitUserIds = unique;
    }

    if (splitUserIds.length === 0) {
      throw new BadRequestException({
        error: 'INVALID_USER_ID',
        message: 'Must split among at least 1 user'
      });  
    }

    // Equal split with remainder handling
    const n = splitUserIds.length;
    const base = Math.floor(amountCents / n);
    const rem = amountCents % n;

    // Stable order so remainder assignment is deterministic:
    // Use group join order as a base, filtered to splitUserIds
    const joinOrder = members.map((m) => m.userId);
    const orderedSplitIds = joinOrder.filter((id) => splitUserIds.includes(id));

    // If splitUserIds didn't preserve join order fully (should), ensure fallback ordering:
    const remaining = splitUserIds.filter((id) => !orderedSplitIds.includes(id));
    const finalSplitIds = [...orderedSplitIds, ...remaining];

    const splits = finalSplitIds.map((userId, idx) => ({
      userId,
      amountCents: base + (idx < rem ? 1 : 0),
    }));

    // Transaction: create expense + splits
    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId,
          description: desc,
          amountCents,
          currency,
          paidById,
          createdById,
          splitType: 'EQUAL', // FIXME: Its hardcoded to be equal
          splits: { create: splits },
        },
        select: {
          id: true,
          groupId: true,
          description: true,
          amountCents: true,
          currency: true,
          paidById: true,
          createdById: true,
          createdAt: true,
          splits: { select: { userId: true, amountCents: true } },
        },
      });

      return created;
    });

    return expense;
  }

  async listGroupExpenses(groupId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        description: true,
        amountCents: true,
        currency: true,
        splitType: true,
        createdAt: true,

        paidBy: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },

        splits: {
          select: {
            userId: true,
            amountCents: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { userId: 'asc' },
        },
      },
    });

    return expenses;
  }


  async getGroupBalances(groupId: string) {
  // Get members
  const members = await this.prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true, user: { select: { email: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  // Map: userId -> { paid, owed }
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  for (const m of members) {
    paid.set(m.userId, 0);
    owed.set(m.userId, 0);
  }

  // Fetch all expenses + splits for group
  const expenses = await this.prisma.expense.findMany({
    where: { groupId },
    select: {
      amountCents: true,
      paidById: true,
      splits: { select: { userId: true, amountCents: true } },
    },
  });

  // Get the sum of expenses and the splits
  for (const e of expenses) {
    paid.set(e.paidById, (paid.get(e.paidById) ?? 0) + e.amountCents);

    for (const s of e.splits) {
      owed.set(s.userId, (owed.get(s.userId) ?? 0) + s.amountCents);
    }
  }

  // Compute balances
  return members.map((m) => {
    const p = paid.get(m.userId) ?? 0;
    const o = owed.get(m.userId) ?? 0;
    return {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      paidCents: p,
      owedCents: o,
      balanceCents: p - o, // + means should receive, - means owes
    };
  });
  }
}
