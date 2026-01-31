import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [ExpensesService]
})
export class ExpensesModule {}
