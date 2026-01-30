import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { GroupMemberGuard } from '../guards/group-member.guard';

export const GroupAuth = () =>
  applyDecorators(UseGuards(AuthGuard, GroupMemberGuard));
