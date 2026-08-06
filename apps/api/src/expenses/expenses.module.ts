import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [ExpensesService]
})
export class ExpensesModule {}
