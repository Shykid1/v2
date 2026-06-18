import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackClient } from './paystack.client';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
