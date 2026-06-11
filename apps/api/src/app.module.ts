import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PublicModule } from './public/public.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DevicesModule } from './devices/devices.module';
import { PaymentModule } from './payment/payment.module';
import { ClientsModule } from './clients/clients.module';
import { BroadcastsModule } from './broadcasts/broadcasts.module';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    ServicesModule,
    WorkingHoursModule,
    AppointmentsModule,
    PublicModule,
    NotificationsModule,
    DevicesModule,
    PaymentModule,
    ClientsModule,
    BroadcastsModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
