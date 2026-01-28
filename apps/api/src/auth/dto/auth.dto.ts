import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  email: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'SecurePassword123!'
  })
  password: string;

  @ApiPropertyOptional({ 
    description: 'User display name',
    example: 'John Doe'
  })
  name?: string;
}

export class LoginDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  email: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'SecurePassword123!'
  })
  password: string;
}