import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Operations Two' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '0241234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiProperty({
    minLength: 8,
    description: 'Temporary password; user must change on first login',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Required when role is provider' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'District a district officer oversees (required for district officers)',
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Region a district officer oversees' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'District officer job title' })
  @IsOptional()
  @IsString()
  title?: string;
}
