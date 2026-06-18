import { Module } from '@nestjs/common';
import { ReadingsController } from './readings.controller';
import { ReadingsService } from './readings.service';
import { HmacGuard } from './guards/hmac.guard';
import { DeviceCacheService } from '../common/services/device-cache.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [ReadingsController],
  providers: [ReadingsService, HmacGuard, DeviceCacheService],
  exports: [ReadingsService],
})
export class ReadingsModule {}
