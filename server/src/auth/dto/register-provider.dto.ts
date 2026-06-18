import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterProviderDto {
  @ApiProperty({ example: 'Kwame Desludging Services' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'Kwame Mensah' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '0207654321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ type: [String], example: ['near', 'mid'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverageZones?: string[];

  @ApiPropertyOptional({ example: 'North East' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'East Mamprusi Municipal' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsInt()
  vehicleCapacityLiters?: number;
}
