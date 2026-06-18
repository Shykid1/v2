import { Module } from '@nestjs/common';
import { SlaScheduler } from './sla.scheduler';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  providers: [SlaScheduler],
})
export class OpsModule {}
