import { Module } from '@nestjs/common';
import { PitsController } from './pits.controller';
import { PitsService } from './pits.service';

@Module({
  controllers: [PitsController],
  providers: [PitsService],
  exports: [PitsService],
})
export class PitsModule {}
