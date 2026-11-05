import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, Fillup } from './tracker';
import {
  gaugeLiters,
  litersPerBar,
  tankSegments,
  gaugeSegments,
  rollingAverage,
  statistics,
  odometerError,
  sortedFills,
  isoWithOffset,
  tankPricePerKm,
  stretchCosts,
} from './math';
const s = DEFAULT_SETTINGS;
const fill = (n: number, changes: Partial<Fillup> = {}): Fillup => ({
  id: String(n),
  amount: 200,
  liters: 4,
  odometer: n * 200,
  dateTime: '2026-10-' + String(n + 1).padStart(2, '0') + 'T10:00:00+08:00',
  station: null,
  grade: null,
  gaugeLevel: 6,
  filledToFull: true,
  latitude: null,
  longitude: null,
  notes: '',
  createdAt: n,
  ...changes,
});
describe('fuel calibration', () => {
  it('maps E and F to the actual anchor and tank capacity', () => {
    expect(litersPerBar(s)).toBeCloseTo((5.5 - 1.2) / 6);
    expect(gaugeLiters(0, s)).toBe(1.2);
    expect(gaugeLiters(6, s)).toBeCloseTo(5.5);
    expect(gaugeLiters(-3, s)).toBe(1.2);
    expect(gaugeLiters(20, s)).toBeCloseTo(5.5);
  });
});
describe('tank-to-tank efficiency', () => {
  it('excludes opening purchase and includes partial plus closing purchases', () => {
    const [segment] = tankSegments([
      fill(0, { liters: 5 }),
      fill(1, { filledToFull: false, liters: 1 }),
      fill(2, { liters: 3 }),
    ]);
    expect(segment.liters).toBe(4);
    expect(segment.km).toBe(400);
    expect(segment.efficiency).toBe(100);
  });
  it('does not treat missing liters as a zero purchase', () => {
    expect(tankSegments([fill(0), fill(1, { liters: null })])[0].efficiency).toBeNull();
  });
  it('does not invent efficiency for one entry or missing odometers', () => {
    expect(tankSegments([fill(0)])).toEqual([]);
    expect(tankSegments([fill(0, { odometer: null }), fill(1)])[0].efficiency).toBeNull();
  });
  it('restarts cleanly after an incomplete segment', () => {
    const segments = tankSegments([fill(0), fill(1, { liters: null }), fill(2)]);
    expect(segments[0].efficiency).toBeNull();
    expect(segments[1].efficiency).toBe(50);
  });
});
describe('gauge chains', () => {
  it('uses the same fuel and odometer interval across a missing gauge', () => {
    const [segment] = gaugeSegments(
      [fill(0), fill(1, { liters: 1, gaugeLevel: null }), fill(2, { liters: 3 })],
      s,
    );
    expect(segment.km).toBe(400);
    expect(segment.liters).toBeCloseTo(4);
    expect(segment.efficiency).toBeCloseTo(100);
  });
  it('requires complete fuel measurements within the interval', () => {
    expect(
      gaugeSegments([fill(0), fill(1, { liters: null, gaugeLevel: null }), fill(2)], s)[0]
        .efficiency,
    ).toBeNull();
  });
  it('ignores missing readings before the first anchor', () => {
    expect(gaugeSegments([fill(0, { gaugeLevel: null }), fill(1), fill(2)], s)).toHaveLength(1);
  });
  it('leaves zero or negative burned fuel unavailable', () => {
    expect(
      gaugeSegments([fill(0, { gaugeLevel: 0 }), fill(1, { liters: 0.1 })], s)[0].efficiency,
    ).toBeNull();
  });
});
describe('dashboard and month attribution', () => {
  it('prefers measurable tank segments over a gauge estimate', () => {
    const stats = statistics([fill(0), fill(1)], s);
    expect(stats.method).toBe('tank');
    expect(stats.efficiency).toBe(50);
    expect(stats.totalDistance).toBe(200);
    expect(stats.costPerKm).toBe(1);
    expect(stats.pricePerLiter).toBe(50);
  });
  it('labels gauge-only efficiency as an estimate', () => {
    const stats = statistics(
      [fill(0, { filledToFull: false }), fill(1, { filledToFull: false })],
      s,
    );
    expect(stats.method).toBe('gauge');
    expect(stats.efficiency).toBeCloseTo(50);
  });
  it('does not invent efficiency, distance, or cost/km for an empty log', () => {
    const stats = statistics([], s);
    expect(stats.totalSpend).toBe(0);
    expect(stats.efficiency).toBeNull();
    expect(stats.totalDistance).toBeNull();
    expect(stats.costPerKm).toBeNull();
  });
  it('puts a cross-month odometer delta in the later month, in recorded local time', () => {
    const stats = statistics(
      [
        fill(0, { dateTime: '2026-10-31T23:50:00+08:00' }),
        fill(1, { dateTime: '2026-11-01T00:10:00+08:00' }),
      ],
      s,
    );
    expect(stats.months[1].month).toBe('2026-11');
    expect(stats.months[1].km).toBe(200);
    expect(stats.months[1].estimated).toBe(false);
  });
  it('rolls over the last five intervals, skipping unavailable values', () => {
    expect(rollingAverage([10, null, 20], 3)).toEqual([10, 10, 15]);
    expect(rollingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
  });
});
describe('ordering and placement', () => {
  it('orders by actual timestamp, then insertion sequence', () => {
    const a = fill(1, { dateTime: '2026-11-01T00:00:00+08:00' });
    const b = fill(2, { dateTime: '2026-10-31T17:00:00Z' });
    expect(sortedFills([b, a]).map((f) => f.id)).toEqual([a.id, b.id]);
  });
  it('rejects odometer corrections outside neighboring readings', () => {
    expect(odometerError([fill(0), fill(2)], fill(1, { odometer: 500 }))).toContain('lower');
    expect(odometerError([fill(0), fill(2)], fill(1, { odometer: 0 }))).toContain('higher');
    expect(odometerError([fill(0), fill(2)], fill(1))).toBeNull();
  });
  it('preserves local calendar values and writes a timezone offset', () => {
    expect(isoWithOffset('2026-11-01T00:30')).toMatch(/^2026-11-01T00:30:00[+-]\d{2}:\d{2}$/);
  });
});

describe('full-tank price estimate', () => {
  it('uses closing price per liter divided by full-tank interval efficiency', () => {
    const from = fill(0, { odometer: 1000 });
    const to = fill(1, { amount: 240, liters: 3, odometer: 1200 });
    expect(tankPricePerKm({ from, to, km: 200, liters: 5, efficiency: 40 })).toBe(2);
    expect(tankPricePerKm(undefined)).toBeNull();
    expect(tankPricePerKm({ from, to, km: null, liters: 5, efficiency: null })).toBeNull();
    expect(
      tankPricePerKm({ from, to: { ...to, liters: null }, km: 200, liters: 5, efficiency: 40 }),
    ).toBeNull();
  });
});

describe('reference chart cost per kilometer', () => {
  it('uses gauge changes and closing price even without full tanks', () => {
    const rows = [
      fill(0, { gaugeLevel: 4, filledToFull: false }),
      fill(1, { gaugeLevel: 2, liters: 3, amount: 180, filledToFull: false }),
    ];
    const burned = gaugeLiters(4, s) + 3 - gaugeLiters(2, s);
    expect(stretchCosts(rows, s)[0].cost).toBeCloseTo((60 * burned) / 200);
  });
  it('matches reference paused chains, adjacent distance and missing-liter handling', () => {
    const rows = [fill(0), fill(1, { gaugeLevel: null, liters: null }), fill(2)];
    const costs = stretchCosts(rows, s);
    expect(costs[0].cost).toBeNull();
    expect(costs[1].cost).toBe(1);
    expect(stretchCosts([fill(0), fill(1, { odometer: null })], s)[0].cost).toBeNull();
    expect(stretchCosts([fill(0), fill(1, { liters: 0 })], s)[0].cost).toBeNull();
    expect(stretchCosts([], s)).toEqual([]);
  });
});
