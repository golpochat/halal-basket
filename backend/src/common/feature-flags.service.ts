import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly config: ConfigService) {}

  private flag(name: string, defaultValue = false): boolean {
    const raw = this.config.get<string>(name);
    if (raw === undefined || raw === '') return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
  }

  isRealtimeEnabled(): boolean {
    return this.flag('FEATURE_REALTIME_DELIVERY', false);
  }

  isMultiShopEnabled(): boolean {
    return this.flag('FEATURE_MULTI_SHOP', false);
  }

  /** Reject realtime when customer riskScore >= this (0 = disabled). */
  realtimeMaxRiskScore(): number {
    const n = Number(this.config.get<string>('REALTIME_MAX_RISK_SCORE') ?? '50');
    return Number.isFinite(n) ? n : 50;
  }

  /** Minutes from now used for realtime estimatedDeliveryAt. */
  realtimeEtaMinutes(): number {
    const n = Number(this.config.get<string>('REALTIME_ETA_MINUTES') ?? '60');
    if (!Number.isFinite(n) || n < 15) return 60;
    return Math.min(Math.floor(n), 24 * 60);
  }

  snapshot() {
    return {
      realtimeDelivery: this.isRealtimeEnabled(),
      multiShop: this.isMultiShopEnabled(),
      realtimeMaxRiskScore: this.realtimeMaxRiskScore(),
      realtimeEtaMinutes: this.realtimeEtaMinutes(),
    };
  }
}
