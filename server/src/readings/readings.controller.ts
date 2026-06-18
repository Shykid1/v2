import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Device, UserRole } from '@prisma/client';
import { Request } from 'express';
import { ReadingsService } from './readings.service';
import { CreateReadingDto } from './dto/create-reading.dto';
import { HmacGuard } from './guards/hmac.guard';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Readings')
@Controller('readings')
export class ReadingsController {
  constructor(private readonly readings: ReadingsService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(HmacGuard)
  @ApiOperation({
    summary: 'Sensor ingest (HMAC-signed); creates a job when pit is full',
  })
  ingest(
    @Body() dto: CreateReadingDto,
    @Req() req: Request & { device: Device },
  ) {
    return this.readings.ingest(dto, req.device);
  }

  @Get('pit/:pitId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin, UserRole.household)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Readings for a pit' })
  byPit(@Param('pitId') pitId: string, @Query('limit') limit?: string) {
    return this.readings.findByPit(pitId, limit ? Number(limit) : undefined);
  }
}
