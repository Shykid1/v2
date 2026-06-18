import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { UssdService } from './ussd.service';
import type {
  ArkeselUssdRequest,
  ArkeselUssdResponse,
} from './interfaces/arkesel-ussd.interface';

@ApiTags('USSD')
@Controller('ussd')
export class UssdController {
  constructor(
    private readonly ussd: UssdService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Arkesel USSD webhook (gated by shared secret)' })
  async handle(
    @Body() body: ArkeselUssdRequest,
    @Headers('x-ussd-secret') headerSecret: string | undefined,
    @Query('secret') querySecret: string | undefined,
  ): Promise<ArkeselUssdResponse> {
    this.assertSecret(headerSecret ?? querySecret);

    const { sessionID, userID, msisdn, userData, newSession } = body;
    const result = await this.ussd.handle(
      sessionID,
      msisdn,
      userData,
      !!newSession,
    );

    return {
      sessionID,
      userID,
      msisdn,
      message: result.message,
      continueSession: result.continueSession,
    };
  }

  private assertSecret(provided: string | undefined): void {
    const expected = this.config.get<string>('USSD_WEBHOOK_SECRET');
    if (!expected) return;
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid USSD webhook secret');
    }
  }
}
