import { Module } from '@nestjs/common';
import { ShopPortalService } from './shop-portal.service';
import { ShopPortalController } from './shop-portal.controller';
import { OrdersModule } from '../orders/orders.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [OrdersModule, StockModule],
  controllers: [ShopPortalController],
  providers: [ShopPortalService],
})
export class ShopPortalModule {}
