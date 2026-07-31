import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  buildPayload(barcode: string, productId?: string): string {
    return productId
      ? `halalbasket:product:${productId}:barcode:${barcode}`
      : `halalbasket:barcode:${barcode}`;
  }

  async generateDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, { margin: 1, width: 256 });
  }
}
