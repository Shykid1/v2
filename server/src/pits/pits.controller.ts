import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PitsService } from './pits.service';
import { CreatePitDto } from './dto/create-pit.dto';
import { RegisterSensorDto } from './dto/register-sensor.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Pits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.household)
@Controller('pits')
export class PitsController {
  constructor(private readonly pits: PitsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a pit (resolves GhanaPost GPS address)' })
  create(@CurrentUser('userId') userId: string, @Body() dto: CreatePitDto) {
    return this.pits.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'My pits with latest reading + devices' })
  list(@CurrentUser('userId') userId: string) {
    return this.pits.listForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A single pit I own, with recent readings' })
  getOne(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.pits.getOwned(userId, id);
  }

  @Post(':id/sensor')
  @ApiOperation({
    summary: 'Bind a sensor to a pit (becomes sensored/premium)',
  })
  registerSensor(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RegisterSensorDto,
  ) {
    return this.pits.registerSensor(userId, id, dto);
  }
}
