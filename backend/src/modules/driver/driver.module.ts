import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { OrdersModule } from '../orders/orders.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { StockPredictionModule } from '../stock-prediction/stock-prediction.module';

@Module({
  imports: [OrdersModule, RiskEngineModule, StockPredictionModule],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
