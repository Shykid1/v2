import { Module } from '@nestjs/common';
import { DistrictController } from './district.controller';
import { DistrictService } from './district.service';
import { AdminModule } from '../admin/admin.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [AdminModule, ReportsModule],
  controllers: [DistrictController],
  providers: [DistrictService],
})
export class DistrictModule {}
