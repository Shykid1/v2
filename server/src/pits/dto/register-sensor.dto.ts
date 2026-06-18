import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RegisterSensorDto {
  @ApiProperty({ example: 'SANI-ESP32-001' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Per-device HMAC key (shared secret)' })
  @IsString()
  @IsNotEmpty()
  hmacKey: string;

  @ApiPropertyOptional({
    example: 200,
    description: 'Calibrated pit depth (cm)',
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(1000)
  pitDepthCm?: number;
}
