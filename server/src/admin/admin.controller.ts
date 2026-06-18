import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('facilities')
  @ApiOperation({
    summary: 'All pits with device, latest reading, owner, and facility status',
  })
  facilities() {
    return this.admin.facilities();
  }

  @Get('facilities/:id')
  @ApiOperation({
    summary: 'Single facility with reading history and recent jobs',
  })
  facility(@Param('id') id: string) {
    return this.admin.facility(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'All users with linked household/provider summary' })
  users() {
    return this.admin.users();
  }

  @Post('users')
  @ApiOperation({
    summary:
      'Create a user (admin / household / provider) with a temp password',
  })
  createUser(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  setActive(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('userId') actingUserId: string,
  ) {
    return this.admin.setActive(id, dto.active, actingUserId);
  }
}
