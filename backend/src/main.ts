import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { createRequire } from 'module';
import helmet from 'helmet';
import { AppModule } from './app.module';

const requireFromCwd = createRequire(join(process.cwd(), 'package.json'));

function freeListenPort(port: number) {
  try {
    const { freePort } = requireFromCwd('./scripts/free-port.js') as {
      freePort: (p: number, opts?: { quiet?: boolean }) => number[];
    };
    freePort(port, { quiet: true });
  } catch {
    /* script missing in some deploy layouts — listenWithRetry still helps */
  }
}

async function listenWithRetry(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  port: number,
  attempts = 8,
) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    freeListenPort(port);
    // Brief pause so Windows releases the socket after taskkill.
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 300 * i));
    }
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
      // eslint-disable-next-line no-console
      console.warn(
        `[boot] :${port} busy (attempt ${i + 1}/${attempts}), freeing and retrying…`,
      );
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
