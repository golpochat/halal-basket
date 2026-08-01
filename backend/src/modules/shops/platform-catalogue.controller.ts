import { Controller, Get, Query } from '@nestjs/common';
import { ShopsService } from './shops.service';

@Controller()
export class PlatformCatalogueController {
  constructor(private readonly shopsService: ShopsService) {}

  /** Public brand catalogue — aggregated stock, no shop identity. */
  @Get('platform/catalogue')
  catalogue(@Query('area') area?: string) {
    return this.shopsService.listPlatformCatalogue(area);
  }
}
