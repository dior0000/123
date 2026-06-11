import * as Sentry from '@sentry/node';

if (process.env['SENTRY_DSN']) {
  Sentry.init({ dsn: process.env['SENTRY_DSN'], environment: process.env['NODE_ENV'] ?? 'development' });
}

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
  console.info(`API listening on http://0.0.0.0:${port}`);
}

bootstrap();
