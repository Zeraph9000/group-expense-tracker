import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateSettlementDto {
  @ApiProperty({
    description: 'User ID receiving the settlement payment',
    example: 'cm812def456',
  })
  @IsString()
  toUserId: string;

  @ApiProperty({
    description: 'Amount in cents',
    example: 2500,
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
    description: 'Optional note for the settlement',
    example: 'Payment for dinner',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
