import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DistanceZone, PitSize } from '@prisma/client';
import { PricingService } from './pricing.service';

@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get('quote')
  @ApiOperation({ summary: 'Get the fixed zonal price for a size + zone' })
  quote(
    @Query('size') size: PitSize,
    @Query('zone') zone: DistanceZone,
    @Query('access') access?: string,
  ) {
    return this.pricing.quote(size ?? 'standard', zone ?? 'near', {
      applyAccessSurcharge: access === 'true',
    });
  }
}
