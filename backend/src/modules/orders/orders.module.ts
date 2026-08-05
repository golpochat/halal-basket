import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderLiveHub } from './order-live.hub';
import { RoutingEngineModule } from '../routing-engine/routing-engine.module';
import { PlatformLocaleModule } from '../platform-locale/platform-locale.module';
import { StockModule } from '../stock/stock.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    RoutingEngineModule,
    PlatformLocaleModule,
    StockModule,
    forwardRef(() => WhatsappModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLiveHub],
  exports: [OrdersService, OrderLiveHub],
})
export class OrdersModule {}
