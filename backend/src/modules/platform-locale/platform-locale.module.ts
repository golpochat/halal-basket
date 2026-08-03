import { Module } from '@nestjs/common';
import { PlatformLocaleController } from './platform-locale.controller';
import { PlatformLocaleService } from './platform-locale.service';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [RbacModule],
  controllers: [PlatformLocaleController],
  providers: [PlatformLocaleService],
  exports: [PlatformLocaleService],
})
export class PlatformLocaleModule {}
