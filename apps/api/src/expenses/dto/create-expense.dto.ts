import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Description of the expense',
    example: 'Dinner at restaurant',
  })
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty({
    description: 'Amount in cents',
    example: 5000,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  amountCents: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'AUD',
    required: false,
    default: 'AUD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'User ID who paid for the expense. Defaults to current user if not provided',
    example: 'cm812abc123',
    required: false,
  })
  @IsOptional()
  @IsString()
  paidById?: string;

  @ApiProperty({
    description: 'Array of user IDs to split the expense among. If omitted, splits among all group members',
    example: ['cm812abc123', 'cm812def456'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  splitAmongUserIds?: string[];
}
