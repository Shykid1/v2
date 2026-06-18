import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistanceZone, PitSize } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePitDto {
  @ApiPropertyOptional({ example: 'Backyard pit' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'NM-0123-4567',
    description: 'GhanaPost GPS address',
  })
  @IsString()
  @IsNotEmpty()
  ghanaPostAddress: string;

  @ApiPropertyOptional({ enum: PitSize, default: PitSize.standard })
  @IsOptional()
  @IsEnum(PitSize)
  sizeClass?: PitSize;

  @ApiPropertyOptional({ enum: DistanceZone, default: DistanceZone.near })
  @IsOptional()
  @IsEnum(DistanceZone)
  zone?: DistanceZone;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(1000)
  pitDepthCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  dropHoles?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  floodRisk?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  community?: string;
}
