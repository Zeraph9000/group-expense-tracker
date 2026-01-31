import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { GroupAuth } from '../groups/decorators/group-auth.decorator';

@ApiTags('expenses')
@Controller('v1/groups/:groupId/expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @GroupAuth()
  @Post()
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a new expense in a group with equal or selected split' })
  @ApiParam({
    name: 'groupId',
    description: 'The group ID',
    example: 'cm812grp123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Expense successfully created with splits',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'cm812exp123' },
        groupId: { type: 'string', example: 'cm812grp123' },
        description: { type: 'string', example: 'Dinner at restaurant' },
        amountCents: { type: 'number', example: 5000 },
        currency: { type: 'string', example: 'AUD' },
        paidById: { type: 'string', example: 'cm812abc123' },
        createdById: { type: 'string', example: 'cm812abc123' },
        createdAt: { type: 'string', format: 'date-time', example: '2026-01-31T10:30:00.000Z' },
        splits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cm812spl123' },
              userId: { type: 'string', example: 'cm812abc123' },
              amountCents: { type: 'number', example: 2500 },
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: `If any of the following are true:
- **INVALID_DESCRIPTION**
  - Description is not at least one character
- **INVALID_EXPENSE**
  - Expense(in cents) is not a positive integer
- **INVALID_USER_ID**
  - Expense is not paid by a user in the group
  - Expense is not split amongst users of the group
  - Expense is not split by at least one user`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
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
  @ApiResponse({
    status: 403,
    description: `If any of the following are true:
- **INVALID_GROUP_ID**
  - Invalid group id is given
  - Group does not have any users`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
      }
    }
  })
  async create(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    const user = (req as any).user as { id: string };

    return this.expenses.createEqualSplitExpense({
      groupId,
      createdById: user.id,
      description: dto.description,
      amountCents: dto.amountCents,
      currency: dto.currency ?? 'AUD',
      paidById: dto.paidById ?? user.id,
      splitAmongUserIds: dto.splitAmongUserIds,
    });
  }

  @GroupAuth()
  @Get()
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'List all expenses for a group' })
  @ApiParam({
    name: 'groupId',
    description: 'The group ID',
    example: 'cm812grp123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of expenses retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cm812exp123' },
          groupId: { type: 'string', example: 'cm812grp123' },
          description: { type: 'string', example: 'Dinner at restaurant' },
          amountCents: { type: 'number', example: 5000 },
          currency: { type: 'string', example: 'AUD' },
          paidById: { type: 'string', example: 'cm812abc123' },
          createdById: { type: 'string', example: 'cm812abc123' },
          splitType: { type: 'string', example: 'EQUAL' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-01-31T10:30:00.000Z' },
          splits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'cm812spl123' },
                userId: { type: 'string', example: 'cm812abc123' },
                amountCents: { type: 'number', example: 2500 },
              }
            }
          }
        }
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
  @ApiResponse({
    status: 403,
    description: `If any of the following are true:
- **INVALID_GROUP_ID**
  - Group does not exist or user is not a member`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
      }
    }
  })
  async list(@Param('groupId') groupId: string) {
    return this.expenses.listGroupExpenses(groupId);
  }

  @GroupAuth()
  @Get('/balances')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get balances for all members in a group' })
  @ApiParam({
    name: 'groupId',
    description: 'The group ID',
    example: 'cm812grp123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Group balances retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: 'cm812abc123' },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'user@example.com' },
          paidCents: { type: 'number', example: 5000, description: 'Total amount paid by this user' },
          owedCents: { type: 'number', example: 2500, description: 'Total amount owed by this user' },
          balanceCents: { type: 'number', example: 2500, description: 'Net balance (positive = owed money, negative = owes money)' }
        }
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
  @ApiResponse({
    status: 403,
    description: `If any of the following are true:
- **INVALID_GROUP_ID**
  - Group does not exist or user is not a member`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
      }
    }
  })
  async balances(@Param('groupId') groupId: string) {
    return this.expenses.getGroupBalances(groupId);
  }
}
