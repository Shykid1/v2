import { Module } from '@nestjs/common';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { UssdSessionStore } from './ussd-session.store';
import { JobsModule } from '../jobs/jobs.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [JobsModule, PricingModule],
  controllers: [UssdController],
  providers: [UssdService, UssdSessionStore],
})
export class UssdModule {}
