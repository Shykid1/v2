import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Settlement details used to create the provider's Paystack subaccount. */
export class SubmitKycDto {
  @ApiProperty({
    example: 'MTN',
    description: 'Settlement bank/MoMo provider code',
  })
  @IsString()
  @IsNotEmpty()
  settlementBank: string;

  @ApiProperty({ example: '0241234567', description: 'Account / MoMo number' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiPropertyOptional({ enum: ['momo', 'bank'], default: 'momo' })
  @IsOptional()
  @IsIn(['momo', 'bank'])
  accountType?: 'momo' | 'bank';
}
