import { SetMetadata } from '@nestjs/common';
import { GroupRole } from '@prisma/client';

export const GROUP_ROLES_KEY = 'group_roles';
export const GroupRoleRequired = (...roles: GroupRole[]) =>
  SetMetadata(GROUP_ROLES_KEY, roles);
