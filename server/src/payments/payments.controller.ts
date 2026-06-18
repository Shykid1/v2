import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhooks/paystack')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Paystack webhook (signature-verified, idempotent)',
  })
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-paystack-signature') signature: string,
  ) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.payments.handleWebhook(raw, signature);
  }

  @Post('payments/sensor-checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.household)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buy a SaniChain sensor (one-off Paystack charge)' })
  sensorCheckout(
    @CurrentUser('userId') userId: string,
    @Body('amount') amount: number,
  ) {
    return this.payments.sensorCheckout(userId, amount);
  }
}
