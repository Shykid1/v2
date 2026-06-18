import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobStatus, TriggerSource, UserRole } from '@prisma/client';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { GuestRequestDto } from './dto/guest-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  // ─── Public ────────────────────────────────────────────────────────────────

  @Post('guest')
  @ApiOperation({
    summary: 'Guest desludging request (no account, GhanaPost GPS)',
  })
  guest(@Body() dto: GuestRequestDto) {
    return this.jobs.createGuestRequest(dto, TriggerSource.guest_request);
  }

  // ─── Household ───────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.household)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request desludging for one of my pits' })
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateJobDto) {
    return this.jobs.createForHousehold(userId, dto);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.household)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve a sensor/climate-triggered job → summon an operator',
  })
  approve(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.jobs.approve(id, userId);
  }

  @Post(':id/decline-approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.household)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decline a pending approval request' })
  declineApproval(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.jobs.declineApproval(id, userId, reason);
  }

  // ─── Provider ────────────────────────────────────────────────────────────────

  @Get('provider/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.provider)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My offered + assigned jobs' })
  mine(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: JobStatus,
  ) {
    return this.jobs.findForProvider(userId, status);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.provider)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept an offered job' })
  accept(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.jobs.accept(id, userId);
  }

  @Post(':id/decline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.provider)
  @ApiBearerAuth()
  decline(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.jobs.decline(id, userId);
  }

  @Post(':id/en-route')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.provider)
  @ApiBearerAuth()
  enRoute(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.jobs.markEnRoute(id, userId);
  }

  @Post(':id/done')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.provider)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark DONE → triggers payment (cash ledger or digital charge)',
  })
  done(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.jobs.markDone(id, userId);
  }

  // ─── Admin (dispatch board) ──────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Job-chain board' })
  findAll(
    @Query('status') status?: JobStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.jobs.findAll({
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.jobs.findOne(id);
  }

  @Post(':id/offer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'One-tap offer to a provider (human-assisted dispatch)',
  })
  offer(@Param('id') id: string, @Body('providerId') providerId: string) {
    return this.jobs.offerToProvider(id, providerId);
  }

  @Post(':id/auto-assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Auto-assign nearest eligible provider' })
  autoAssign(@Param('id') id: string) {
    return this.jobs.autoAssign(id);
  }

  @Post(':id/broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Broadcast to all eligible providers (first to accept wins)',
  })
  broadcast(@Param('id') id: string) {
    return this.jobs.broadcast(id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.jobs.cancel(id, reason);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  close(@Param('id') id: string) {
    return this.jobs.close(id);
  }
}
