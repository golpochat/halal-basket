import { Injectable, Logger } from '@nestjs/common';

type Counters = {
  httpRequests: number;
  http5xx: number;
  orderCreates: number;
  orderCreateFailures: number;
  routingFailures: number;
  paymentWebhookFailures: number;
  loginFailures: number;
  loginLockouts: number;
};

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly counters: Counters = {
    httpRequests: 0,
    http5xx: 0,
    orderCreates: 0,
    orderCreateFailures: 0,
    routingFailures: 0,
    paymentWebhookFailures: 0,
    loginFailures: 0,
    loginLockouts: 0,
  };

  inc(key: keyof Counters, by = 1) {
    this.counters[key] += by;
  }

  snapshot() {
    return {
      ...this.counters,
      uptimeSec: Math.floor(process.uptime()),
      generatedAt: new Date().toISOString(),
    };
  }

  /** Deliberate alert for on-call drill (Phase F exit criteria). */
  fireTestAlert(reason: string) {
    this.logger.error(`ALERT_TEST fired: ${reason}`);
    return {
      ok: true,
      message: 'Test alert logged at ERROR level',
      reason,
      at: new Date().toISOString(),
    };
  }
}
