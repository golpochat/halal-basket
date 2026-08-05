import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConsoleWhatsappProvider } from './console.whatsapp.provider';
import { MetaWhatsappProvider } from './meta.whatsapp.provider';
import { WHATSAPP_PROVIDER } from './whatsapp.provider';
import { WhatsappCommerceService } from './whatsapp-commerce.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappInboxService } from './whatsapp-inbox.service';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AuthModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [WhatsappController],
  providers: [
    {
      provide: WHATSAPP_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('WHATSAPP_TOKEN')?.trim();
        const phoneId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim();
        if (token && phoneId) {
          return new MetaWhatsappProvider(config);
        }
        return new ConsoleWhatsappProvider();
      },
    },
    WhatsappService,
    WhatsappInboxService,
    WhatsappCommerceService,
  ],
  exports: [WhatsappService],
})
export class WhatsappModule {}
