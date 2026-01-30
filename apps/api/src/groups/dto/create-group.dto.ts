import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateGroupDto {
  @ApiProperty({
    description: 'Name of the group',
    example: 'Weekend Trip',
    minLength: 2
  })
  @IsString()
  @MinLength(2)
  name: string;
}
