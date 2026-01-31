import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { GroupAuth } from '../groups/decorators/group-auth.decorator';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@ApiTags('settlements')
@Controller('v1/groups/:groupId/settlements')
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @GroupAuth()
  @Post()
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a settlement payment between group members' })
  @ApiParam({
    name: 'groupId',
    description: 'The group ID',
    example: 'cm812grp123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'cm812set123' },
        groupId: { type: 'string', example: 'cm812grp123' },
        fromUserId: { type: 'string', example: 'cm812abc123' },
        toUserId: { type: 'string', example: 'cm812def456' },
        amountCents: { type: 'number', example: 2500 },
        currency: { type: 'string', example: 'AUD' },
        note: { type: 'string', example: 'Payment for dinner', nullable: true },
        createdAt: { type: 'string', format: 'date-time', example: '2026-02-01T10:30:00.000Z' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: `If any of the following are true:
- **INVALID_SETTLEMENT**
  - Amount is not positive
  - toUserId is not a member of the group
  - Cannot settle with yourself`,
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
  - Group does not exist or user is not a member`,
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
    @Body() dto: CreateSettlementDto,
  ) {
    const user = (req as any).user as { id: string };

    return this.settlements.createSettlement({
      groupId,
      fromUserId: user.id,
      toUserId: dto.toUserId,
      amountCents: dto.amountCents,
      currency: dto.currency ?? 'AUD',
      note: dto.note,
    });
  }

  @GroupAuth()
  @Get()
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'List all settlements for a group' })
  @ApiParam({
    name: 'groupId',
    description: 'The group ID',
    example: 'cm812grp123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of settlements retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cm812set123' },
          amountCents: { type: 'number', example: 2500 },
          currency: { type: 'string', example: 'AUD' },
          note: { type: 'string', example: 'Payment for dinner', nullable: true },
          createdAt: { type: 'string', format: 'date-time', example: '2026-02-01T10:30:00.000Z' },
          fromUser: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cm812abc123' },
              name: { type: 'string', example: 'John Doe', nullable: true },
              email: { type: 'string', example: 'john@example.com' }
            }
          },
          toUser: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cm812def456' },
              name: { type: 'string', example: 'Jane Smith', nullable: true },
              email: { type: 'string', example: 'jane@example.com' }
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
    return this.settlements.listSettlements(groupId);
  }
}
