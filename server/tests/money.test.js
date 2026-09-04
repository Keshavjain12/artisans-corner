import { describe, expect, it } from '@jest/globals';
import { fromMinorUnits, round2, splitCommission, toMinorUnits } from '../utils/money.js';

describe('commission maths', () => {
  it('takes 5% of a $100 sale and pays the vendor $95', () => {
    expect(splitCommission(100, 0.05)).toEqual({ platformFee: 5, vendorEarnings: 95 });
  });

  it('keeps fee + payout exactly equal to the subtotal', () => {
    for (const subtotal of [0.01, 9.99, 33.33, 68, 118.5, 1249.95]) {
      const { platformFee, vendorEarnings } = splitCommission(subtotal, 0.05);
      expect(round2(platformFee + vendorEarnings)).toBe(round2(subtotal));
    }
  });

  it('honours a different commission rate', () => {
    expect(splitCommission(200, 0.1)).toEqual({ platformFee: 20, vendorEarnings: 180 });
  });

  it('converts to and from Stripe minor units without drift', () => {
    expect(toMinorUnits(118.5)).toBe(11850);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(fromMinorUnits(11850)).toBe(118.5);
  });
});
