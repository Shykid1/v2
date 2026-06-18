import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProviderVerificationStatus, UserRole } from '@prisma/client';
import { ProvidersService } from './providers.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get('me')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'My provider profile' })
  me(@CurrentUser('userId') userId: string) {
    return this.providers.getMe(userId);
  }

  @Patch('me')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Update coverage, availability, base location' })
  update(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providers.update(userId, dto);
  }

  @Post('me/kyc')
  @Roles(UserRole.provider)
  @ApiOperation({
    summary: 'Submit settlement details (creates Paystack subaccount)',
  })
  submitKyc(@CurrentUser('userId') userId: string, @Body() dto: SubmitKycDto) {
    return this.providers.submitKyc(userId, dto);
  }

  @Get('me/earnings')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Transactions, revenue, and commission ledger' })
  earnings(@CurrentUser('userId') userId: string) {
    return this.providers.earnings(userId);
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'List providers (optionally by verification status)',
  })
  list(@Query('status') status?: ProviderVerificationStatus) {
    return this.providers.list(status);
  }

  @Get(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Provider detail (owner, recent jobs, ledger)' })
  findOne(@Param('id') id: string) {
    return this.providers.findOne(id);
  }

  @Post(':id/verify')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Approve a provider (KYC required)' })
  verify(@Param('id') id: string) {
    return this.providers.verify(id);
  }

  @Post(':id/reject')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Reject a provider application' })
  reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.providers.reject(id, reason);
  }
}
