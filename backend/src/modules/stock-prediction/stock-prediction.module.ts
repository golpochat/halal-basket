import { Module } from '@nestjs/common';
import { StockPredictionService } from './stock-prediction.service';

@Module({
  providers: [StockPredictionService],
  exports: [StockPredictionService],
})
export class StockPredictionModule {}
