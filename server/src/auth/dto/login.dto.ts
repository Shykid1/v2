import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email address or phone number',
    example: 'admin@sanichain.io',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'admin1234' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
