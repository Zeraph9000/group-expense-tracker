import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupMemberGuard } from './guards/group-member.guard';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { ExpensesModule } from 'src/expenses/expenses.module';
import { ExpensesService } from 'src/expenses/expenses.service';

@Module({
  imports: [AuthModule, ExpensesModule],
  controllers: [GroupsController],
  providers: [GroupMemberGuard, GroupsService, ExpensesService],
  exports: [GroupMemberGuard],
})
export class GroupsModule {}
