import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const started = Date.now();
    const requestId = req.headers['x-request-id'];
    const isSse = /\/live\/stream(?:\?|$)/.test(req.originalUrl ?? '');

    return next.handle().pipe(
      tap({
        next: () => {
          if (isSse) return;
          this.metrics.inc('httpRequests');
          if (res.statusCode >= 500) this.metrics.inc('http5xx');
          this.logger.log(
            JSON.stringify({
              requestId,
              method: req.method,
              path: req.originalUrl,
              status: res.statusCode,
              ms: Date.now() - started,
            }),
          );
        },
        error: (err: { status?: number; message?: string }) => {
          this.metrics.inc('httpRequests');
          const status = err?.status ?? 500;
          if (status >= 500) this.metrics.inc('http5xx');
          this.logger.warn(
            JSON.stringify({
              requestId,
              method: req.method,
              path: req.originalUrl,
              status,
              ms: Date.now() - started,
              error: err?.message,
            }),
          );
        },
      }),
    );
  }
}
