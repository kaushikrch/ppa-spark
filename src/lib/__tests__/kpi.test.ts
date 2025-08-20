import { describe, it, expect } from 'vitest';
import { calculateTrend, formatChange } from '../kpi';

describe('calculateTrend', () => {
  it('detects decrease in revenue', () => {
    const { change, trend } = calculateTrend(12_400_000, 12_500_000);
    expect(trend).toBe('down');
    expect(formatChange(change)).toBe('-0.8%');
  });

  it('detects increase in margin', () => {
    const { change, trend } = calculateTrend(3_900_000, 3_300_000);
    expect(trend).toBe('up');
    expect(formatChange(change)).toBe('+18.2%');
  });

  it('detects no change', () => {
    const { change, trend } = calculateTrend(5, 5);
    expect(trend).toBe('neutral');
    expect(formatChange(change)).toBe('0.0%');
  });
});
