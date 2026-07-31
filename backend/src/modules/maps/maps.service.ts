import { Injectable } from '@nestjs/common';

export type LatLng = { lat: number; lng: number };

/** Simple maps adapter: haversine distance (km). No external API required for Phase D. */
@Injectable()
export class MapsService {
  distanceKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const lat1 = this.toRad(a.lat);
    const lat2 = this.toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Approximate Dublin suburb centroids for pilot areas when client omits coords. */
  areaCentroid(areaName: string): LatLng | null {
    const key = areaName.trim().toLowerCase();
    const map: Record<string, LatLng> = {
      lucan: { lat: 53.3572, lng: -6.4486 },
      swords: { lat: 53.4597, lng: -6.2181 },
      tallaght: { lat: 53.2889, lng: -6.3556 },
    };
    return map[key] ?? null;
  }

  extractLatLng(address: Record<string, unknown> | undefined): LatLng | null {
    if (!address) return null;
    const lat = Number(address.lat);
    const lng = Number(address.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  private toRad(deg: number) {
    return (deg * Math.PI) / 180;
  }
}
