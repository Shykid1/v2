import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ClimateService } from './climate.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Climate')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('climate')
export class ClimateController {
  constructor(private readonly climate: ClimateService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Latest climate snapshot per district' })
  latest() {
    return this.climate.latest();
  }

  @Post('run')
  @ApiOperation({
    summary: 'Trigger a climate poll (force a flood window for demo)',
  })
  run(@Query('forceFlood') forceFlood?: string) {
    return this.climate.pollAll(forceFlood === 'true');
  }
}
