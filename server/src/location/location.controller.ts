import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LocationService } from './location.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @Get('regions')
  @ApiOperation({
    summary: 'Ghana regions with their districts (public; powers location selects)',
  })
  regions() {
    return this.location.regions();
  }
}
