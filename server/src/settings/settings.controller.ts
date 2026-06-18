import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { SettingKey } from './settings.service';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'All platform settings (with defaults)' })
  all() {
    return this.settings.all();
  }

  @Put()
  @ApiOperation({ summary: 'Update a setting (e.g. dispatch.mode)' })
  set(@Body('key') key: SettingKey, @Body('value') value: unknown) {
    return this.settings.set(key, value);
  }
}
