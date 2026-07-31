import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { QrCodeService } from './qr-code.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, QrCodeService],
  exports: [ProductsService, QrCodeService],
})
export class ProductsModule {}
