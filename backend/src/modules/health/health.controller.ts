import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../common/metrics.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  @SkipThrottle()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      service: 'halal-basket-api',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
    };
  }

  @Get('metrics')
  @SkipThrottle()
  metricsPublic() {
    // Lightweight public snapshot for uptime monitors (no PII).
    const snap = this.metrics.snapshot();
    return {
      httpRequests: snap.httpRequests,
      http5xx: snap.http5xx,
      uptimeSec: snap.uptimeSec,
      generatedAt: snap.generatedAt,
    };
  }
}
