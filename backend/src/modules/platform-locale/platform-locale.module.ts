import { Module } from '@nestjs/common';
import { PlatformLocaleController } from './platform-locale.controller';
import { PlatformLocaleService } from './platform-locale.service';

@Module({
  controllers: [PlatformLocaleController],
  providers: [PlatformLocaleService],
  exports: [PlatformLocaleService],
})
export class PlatformLocaleModule {}
