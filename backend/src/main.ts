import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function listenWithRetry(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  port: number,
  attempts = 5,
) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await app.listen(port);
      return;
    } catch (err) {
      lastError = err;
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code?: string }).code
          : undefined;
      if (code !== 'EADDRINUSE' || i === attempts - 1) {
        throw err;
      }
      // Watch restarts on Windows often race the previous child exiting.
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());

  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await listenWithRetry(app, port);
  // eslint-disable-next-line no-console
  console.log(`Halal Basket API listening on http://localhost:${port}`);
}

bootstrap();
