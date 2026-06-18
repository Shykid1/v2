import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReadingDto {
  @ApiProperty({ example: 'SANI-ESP32-001' })
  @IsString()
  device_id: string;

  @ApiProperty({ example: 'PIT-00001' })
  @IsString()
  pit_code: string;

  @ApiProperty({ example: '2026-06-17T06:00:00.000Z' })
  @IsString()
  timestamp: string;

  @ApiProperty({ example: 82.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  fill_pct: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fill_cm?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  pit_depth_cm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperature_c?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  humidity_pct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  battery_mv?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rssi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiProperty({ description: 'HMAC-SHA256 hex signature' })
  @IsString()
  hmac: string;
}
