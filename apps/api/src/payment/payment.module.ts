import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PAYMENT_PROVIDER } from './payment.provider';
import { StubPaymentProvider } from './providers/stub.provider';
import { YooKassaProvider } from './providers/yookassa.provider';

const paymentProviderFactory = {
  provide: PAYMENT_PROVIDER,
  useFactory: (config: ConfigService) => {
    const name = config.get<string>('PAYMENT_PROVIDER') ?? 'stub';
    if (name === 'yookassa') return new YooKassaProvider(config);
    return new StubPaymentProvider();
  },
  inject: [ConfigService],
};

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, paymentProviderFactory],
  exports: [PaymentService],
})
export class PaymentModule {}
