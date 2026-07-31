import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AuditService } from './audit.service';
import { FeatureFlagsService } from './feature-flags.service';

@Global()
@Module({
  providers: [MetricsService, AuditService, FeatureFlagsService],
  exports: [MetricsService, AuditService, FeatureFlagsService],
})
export class CommonModule {}
