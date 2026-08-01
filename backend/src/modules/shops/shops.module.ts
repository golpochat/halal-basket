import { Module } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { PlatformCatalogueController } from './platform-catalogue.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [ShopsController, PlatformCatalogueController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
