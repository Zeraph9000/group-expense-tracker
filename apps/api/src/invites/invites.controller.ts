import { Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import { InvitesService } from './invites.service';

@ApiTags('invites')
@Controller('v1/invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Auth()
  @Post(':token/accept')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Accept a group invite using the invite token' })
  @ApiParam({
    name: 'token',
    description: 'The invite token',
    example: 'abc123xyz789def456ghi012jkl345mno678pqr901stu234',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Invite successfully accepted and user added to group',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        groupId: { type: 'string', example: 'cm812grp123' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: `If any of the following are true:
- **INVALID_INVITE_TOKEN**
  - Invite token does not exist
  - Invite has expired`,
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
- **INVALID_ROLE**
  - User is already a member or owner of this group`,
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'ERROR_TYPE' },
        message: { type: 'string', example: 'Descriptive error message' }
      }
    }
  })
  async accept(@Req() req: Request, @Param('token') token: string) {
    const user = (req as any).user as { id: string };
    return this.invites.acceptInvite(token, user.id);
  }
}
