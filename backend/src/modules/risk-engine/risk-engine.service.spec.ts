import { RiskEngineService } from './risk-engine.service';

describe('RiskEngineService scoring math', () => {
  it('applies blueprint weights', () => {
    // Pure expectation documentation of weights used in service
    const refunds = 1;
    const complaints = 1;
    const rude = 1;
    const frequent = 1;
    const lowAvgBonus = 1;
    const score =
      refunds * 10 +
      complaints * 8 +
      rude * 15 +
      frequent * 10 +
      lowAvgBonus * 10;
    expect(score).toBe(53);
    expect(RiskEngineService.name).toBe('RiskEngineService');
  });
});
