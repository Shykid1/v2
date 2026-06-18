import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: 'Activate or deactivate the account' })
  @IsBoolean()
  active: boolean;
}
