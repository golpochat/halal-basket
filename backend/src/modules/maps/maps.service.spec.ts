import { MapsService } from './maps.service';

describe('MapsService', () => {
  const maps = new MapsService();

  it('computes haversine distance between Dublin points', () => {
    const lucan = { lat: 53.3572, lng: -6.4486 };
    const swords = { lat: 53.4597, lng: -6.2181 };
    const km = maps.distanceKm(lucan, swords);
    expect(km).toBeGreaterThan(15);
    expect(km).toBeLessThan(30);
  });

  it('resolves area centroids', () => {
    expect(maps.areaCentroid('Lucan')?.lat).toBeCloseTo(53.3572, 3);
  });
});
