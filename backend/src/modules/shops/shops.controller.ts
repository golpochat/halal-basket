import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  list() {
    return this.shopsService.listActive();
  }

  @Get(':shopId/products')
  products(@Param('shopId', ParseUUIDPipe) shopId: string) {
    return this.shopsService.listShopProducts(shopId);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.getById(id);
  }
}
