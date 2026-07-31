import { Controller, Get } from '@nestjs/common';
import { FeatureFlagsService } from '../../common/feature-flags.service';

@Controller('features')
export class FeaturesController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get()
  get() {
    return this.flags.snapshot();
  }
}
