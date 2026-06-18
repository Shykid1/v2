import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistanceZone, PaymentMethod, PitSize } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** A guest (no account) requests desludging via the landing page or USSD. */
export class GuestRequestDto {
  @ApiProperty({ example: '0241234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

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

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.cash })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}
