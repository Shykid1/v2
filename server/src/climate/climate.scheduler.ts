import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ClimateService } from './climate.service';

@Injectable()
export class ClimateScheduler {
  private readonly logger = new Logger(ClimateScheduler.name);

  constructor(private readonly climate: ClimateService) {}

  @Cron('0 */6 * * *')
  async poll(): Promise<void> {
    this.logger.log('Climate poll starting…');
    const result = await this.climate.pollAll();
    this.logger.log(
      `Climate poll complete (${result.districts - result.failed}/${result.districts} districts)`,
    );
  }
}
