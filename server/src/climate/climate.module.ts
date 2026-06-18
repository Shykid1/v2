import { Module } from '@nestjs/common';
import { ClimateService } from './climate.service';
import { ClimateScheduler } from './climate.scheduler';
import { ClimateController } from './climate.controller';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [ClimateController],
  providers: [ClimateService, ClimateScheduler],
  exports: [ClimateService],
})
export class ClimateModule {}
