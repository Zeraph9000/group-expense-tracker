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
    const settleDelta = new Map<string, number>();
    for (const m of members) {
      paid.set(m.userId, 0);
      owed.set(m.userId, 0);
      settleDelta.set(m.userId, 0);
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

    // Get the settlements that are already paid
    const settlements = await this.prisma.settlement.findMany({
      where: { groupId },
      select: { fromUserId: true, toUserId: true, amountCents: true },
    });

    for (const st of settlements) {
      settleDelta.set(
        st.fromUserId,
        (settleDelta.get(st.fromUserId) ?? 0) + st.amountCents,
      );
      settleDelta.set(
        st.toUserId,
        (settleDelta.get(st.toUserId) ?? 0) - st.amountCents,
      );
    }

    // Compute balances
    return members.map((m) => {
      const p = paid.get(m.userId) ?? 0;
      const o = owed.get(m.userId) ?? 0;
      const sd = settleDelta.get(m.userId) ?? 0;
      const balance = (p - o) + sd;
      return {
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        paidCents: p,
        owedCents: o,
        settlementDeltaCents: sd,
        balanceCents: balance, // + receive, - pay
      };
    });
  }

  async getSettleUpPlan(groupId: string) {
    const balances = await this.getGroupBalances(groupId);

    // Lookup table for display info
    const userInfo = new Map<
      string,
      { name: string | null; email: string }
    >();

    for (const b of balances) {
      userInfo.set(b.userId, { name: b.name ?? null, email: b.email });
    }

    // Build lists (amounts are absolute cents)
    const debtors = balances
      .filter((b) => b.balanceCents < 0)
      .map((b) => ({
        userId: b.userId,
        remainingCents: -b.balanceCents,
      }));

    const creditors = balances
      .filter((b) => b.balanceCents > 0)
      .map((b) => ({
        userId: b.userId,
        remainingCents: b.balanceCents,
      }));

    const transfers: Array<{
      fromUserId: string;
      fromName: string | null;
      fromEmail: string;
      toUserId: string;
      toName: string | null;
      toEmail: string;
      amountCents: number;
    }> = [];

    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];

      const amount = Math.min(d.remainingCents, c.remainingCents);

      if (amount > 0) {
        const from = userInfo.get(d.userId);
        const to = userInfo.get(c.userId);

        // These should always exist because balances come from group members
        if (!from || !to) {
          throw new Error('Invariant failed: missing user info for settle-up plan');
        }

        transfers.push({
          fromUserId: d.userId,
          fromName: from.name,
          fromEmail: from.email,
          toUserId: c.userId,
          toName: to.name,
          toEmail: to.email,
          amountCents: amount,
        });

        d.remainingCents -= amount;
        c.remainingCents -= amount;
      }

      if (d.remainingCents === 0) i++;
      if (c.remainingCents === 0) j++;
    }

    return {
      // Keep balances too (useful for UI and debugging)
      balances: balances.map((b) => ({
        userId: b.userId,
        name: b.name,
        email: b.email,
        balanceCents: b.balanceCents,
      })),
      transfers,
    };
  }

}
