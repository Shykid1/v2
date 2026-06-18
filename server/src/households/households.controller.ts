import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { HouseholdsService } from './households.service';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Households')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.household)
@Controller('households')
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  @Get('me')
  @ApiOperation({ summary: 'My household profile + pits' })
  me(@CurrentUser('userId') userId: string) {
    return this.households.getByUser(userId);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update payment preference, WhatsApp number, location',
  })
  update(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateHouseholdDto,
  ) {
    return this.households.update(userId, dto);
  }

  @Get('me/jobs')
  @ApiOperation({ summary: 'My job history' })
  jobs(@CurrentUser('userId') userId: string) {
    return this.households.jobs(userId);
  }
}
