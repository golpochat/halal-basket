import { Module } from '@nestjs/common';
import { ShopPortalService } from './shop-portal.service';
import { ShopPortalController } from './shop-portal.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [ShopPortalController],
  providers: [ShopPortalService],
})
export class ShopPortalModule {}
