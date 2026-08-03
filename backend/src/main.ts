import { NestFactory } from '@nestjs/core';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { createRequire } from 'module';
import helmet from 'helmet';
import { AppModule } from './app.module';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  const out: string[] = [];
  for (const err of errors) {
    if (err.constraints) {
      out.push(...Object.values(err.constraints));
    }
    if (err.children?.length) {
      out.push(...flattenValidationErrors(err.children));
    }
  }
  return out;
}

function humanizeConstraint(message: string): string {
  const m = message.trim();
  if (/must be an email/i.test(m)) return 'Please enter a valid email address.';
  if (/password.*longer than or equal to/i.test(m)) {
    return 'Password must be at least 8 characters.';
  }
  if (/avatarUrl.*shorter/i.test(m) || /avatar.*too large/i.test(m)) {
    return 'That image is too large. Please use a photo under 350KB.';
  }
  if (/should not be empty/i.test(m)) {
    return 'Please fill in all required fields.';
  }
  if (/should not exist/i.test(m)) {
    return 'Some fields are not allowed. Please refresh and try again.';
  }
  if (/must be a uuid/i.test(m)) {
    return 'Something looks invalid. Please refresh and try again.';
  }
  return m;
}

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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Avatar data-URLs can exceed Express's default 100kb JSON limit (UI allows 350KB).
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  const uploadsRoot = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });

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
      exceptionFactory: (errors) => {
        const messages = flattenValidationErrors(errors).map(humanizeConstraint);
        const unique = [...new Set(messages.filter(Boolean))];
        return new BadRequestException(
          unique.length > 0 ? unique : ['Please check your entries and try again.'],
        );
      },
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await listenWithRetry(app, port);
  // eslint-disable-next-line no-console
  console.log(`Halal Basket API listening on http://localhost:${port}`);
}

bootstrap();
