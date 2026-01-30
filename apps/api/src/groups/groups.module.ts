import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupMemberGuard } from './guards/group-member.guard';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [AuthModule],
  controllers: [GroupsController],
  providers: [GroupMemberGuard, GroupsService],
  exports: [GroupMemberGuard],
})
export class GroupsModule {}
