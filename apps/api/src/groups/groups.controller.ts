import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupAuth } from './decorators/group-auth.decorator';
import { GroupRoleRequired } from './decorators/group-role.decorator';
import { GroupRole } from '@prisma/client';
import { ExpensesService } from 'src/expenses/expenses.service';

@ApiTags('groups')
@Controller('v1/groups')
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly expenses: ExpensesService
  ) {}

  @Auth()
  @Post()
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({
    status: 200,
    description: 'Group successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'cm812grp123' },
        name: { type: 'string', example: 'Weekend Trip' },
        createdAt: { type: 'string', format: 'date-time', example: '2026-01-30T21:30:00.000Z' },
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: `If any of the following are true:
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
  async create(@Req() req: Request, @Body() dto: CreateGroupDto) {
    const user = (req as any).user as { id: string };
    return this.groups.createGroup(user.id, dto.name);
  }

  @Auth()
  @Get()
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get all groups the current user is a member of' })
  @ApiResponse({
    status: 200,
    description: 'List of groups retrieved successfully',
    schema: {
      type: 'array',
        items: {
            type: 'object',
            properties: {
            role: { type: 'string', example: 'OWNER' },
            id: { type: 'string', example: 'cm812mem123' },
            name: { type: 'string', example: 'Weekend Trip' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-02-28T10:30:00.000Z' },
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
  async getList(@Req() req: Request) {
    const user: { id: string } = (req as any).user;
    return this.groups.listMyGroups(user.id);
  }

  @GroupAuth()
  @GroupRoleRequired(GroupRole.OWNER)
  @Post(':groupId/invites')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create an invite code for a group, only valid for one week' })
  @ApiResponse({
    status: 200,
    description: 'Invite code successfully created',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'abc123xyz789' },
        expiresAt: { type: 'string', format: 'date-time', example: '2026-02-06T21:30:00.000Z', nullable: true }
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
  - Group with the id does not exist
  - User is not the owner or creator of the group`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
      }
    }
  })
  async createInvite(@Req() req: Request, @Param('groupId') groupId: string) {
    const user = (req as any).user as { id: string };
    return this.groups.createInvite(groupId, user.id);
  }

  @GroupAuth()
  @Get(':groupId/settle/suggestions')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get settlement suggestions to balance the group' })
  @ApiResponse({
    status: 200,
    description: 'Settlement plan retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balances: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string', example: 'cm812abc123' },
              name: { type: 'string', example: 'John Doe', nullable: true },
              email: { type: 'string', example: 'john@example.com' },
              balanceCents: { type: 'number', example: 2500, description: 'Positive = owed money, Negative = owes money' }
            }
          }
        },
        transfers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fromUserId: { type: 'string', example: 'cm812abc123' },
              fromName: { type: 'string', example: 'John Doe', nullable: true },
              fromEmail: { type: 'string', example: 'john@example.com' },
              toUserId: { type: 'string', example: 'cm812def456' },
              toName: { type: 'string', example: 'Jane Smith', nullable: true },
              toEmail: { type: 'string', example: 'jane@example.com' },
              amountCents: { type: 'number', example: 2500 }
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
  async settleSuggestions(@Param('groupId') groupId: string) {
    return this.expenses.getSettleUpPlan(groupId); // getSettleUpPlan is in expenses
  }

}
