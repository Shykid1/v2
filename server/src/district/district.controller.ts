import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DistrictService } from './district.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('District')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.district_officer, UserRole.admin)
@Controller('district')
export class DistrictController {
  constructor(private readonly district: DistrictService) {}

  @Get('overview')
  @ApiOperation({ summary: 'District-scoped monitoring + regulation overview' })
  overview(@CurrentUser('userId') userId: string) {
    return this.district.overview(userId);
  }

  @Get('facilities')
  @ApiOperation({ summary: 'Monitored pits in my district' })
  facilities(@CurrentUser('userId') userId: string) {
    return this.district.facilities(userId);
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Regulatory queue: pending/overdue approvals, SLA breaches, critical pits',
  })
  alerts(@CurrentUser('userId') userId: string) {
    return this.district.alerts(userId);
  }

  @Get('reports')
  @ApiOperation({ summary: 'District-scoped SDG/compliance report rollups' })
  reports(@CurrentUser('userId') userId: string) {
    return this.district.reportSummary(userId);
  }

  @Post('jobs/:id/escalate')
  @ApiOperation({ summary: 'Flag a job for review with a compliance note' })
  escalate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('note') note?: string,
  ) {
    return this.district.escalate(id, userId, note);
  }
}
