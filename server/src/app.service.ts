import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'sanichain-v2-api',
      timestamp: new Date().toISOString(),
    };
  }
}
