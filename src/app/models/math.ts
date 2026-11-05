import { BikeSettings, Fillup } from './tracker';

export const litersPerBar = (s: BikeSettings): number =>
  (s.tankCapacity - s.lowFuelAnchor) / s.gaugeSegments;
export const gaugeLiters = (bars: number, s: BikeSettings): number =>
  s.lowFuelAnchor + Math.max(0, Math.min(s.gaugeSegments, bars)) * litersPerBar(s);
export const compareFills = (a: Fillup, b: Fillup): number =>
  Date.parse(a.dateTime) - Date.parse(b.dateTime) ||
  a.createdAt - b.createdAt ||
  a.id.localeCompare(b.id);
export const sortedFills = (fills: readonly Fillup[]): Fillup[] => [...fills].sort(compareFills);
export const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function rollingAverage(values: (number | null)[], size = 5): (number | null)[] {
  return values.map((_, i) =>
    mean(values.slice(Math.max(0, i - size + 1), i + 1).filter((v): v is number => v !== null)),
  );
}
export interface Segment {
  from: Fillup;
  to: Fillup;
  km: number | null;
  liters: number | null;
  efficiency: number | null;
}
/** Price estimate using the closing purchase price and measured interval efficiency. */
export function tankPricePerKm(segment: Segment | undefined): number | null {
  return segment &&
    segment.efficiency !== null &&
    segment.efficiency > 0 &&
    segment.to.liters !== null &&
    segment.to.liters > 0
    ? segment.to.amount / segment.to.liters / segment.efficiency
    : null;
}
/** Reference chart semantics: gauge fuel chain with adjacent odometer readings. */
export function stretchCosts(
  fills: readonly Fillup[],
  settings: BikeSettings,
): { to: Fillup; cost: number | null }[] {
  const rows = sortedFills(fills);
  let anchor = rows.findIndex((fill) => fill.gaugeLevel !== null);
  return rows.slice(1).map((to, index) => {
    const i = index + 1;
    const from = rows[i - 1];
    let burned: number | null = null;
    if (to.gaugeLevel !== null && anchor >= 0) {
      const purchased = rows
        .slice(anchor + 1, i + 1)
        .reduce((sum, fill) => sum + (fill.liters ?? 0), 0);
      const fuel =
        gaugeLiters(rows[anchor].gaugeLevel!, settings) +
        purchased -
        gaugeLiters(to.gaugeLevel, settings);
      if (fuel > 0) burned = fuel;
    }
    if (to.gaugeLevel !== null) anchor = i;
    const km = from.odometer !== null && to.odometer !== null ? to.odometer - from.odometer : null;
    const efficiency = km !== null && km > 0 && burned !== null ? km / burned : null;
    return {
      to,
      cost:
        efficiency !== null && to.liters !== null && to.liters > 0
          ? to.amount / to.liters / efficiency
          : null,
    };
  });
}
/** The opening full tank's purchase is excluded; the closing purchase is included. */
export function tankSegments(fills: readonly Fillup[]): Segment[] {
  const rows = sortedFills(fills);
  const segments: Segment[] = [];
  let anchor = -1;
  rows.forEach((f, i) => {
    if (!f.filledToFull) return;
    if (anchor >= 0) {
      const from = rows[anchor];
      const window = rows.slice(anchor + 1, i + 1);
      const liters = window.some((r) => r.liters === null)
        ? null
        : window.reduce((sum, r) => sum + (r.liters ?? 0), 0);
      const km = from.odometer !== null && f.odometer !== null ? f.odometer - from.odometer : null;
      segments.push({
        from,
        to: f,
        km,
        liters,
        efficiency: km !== null && km > 0 && liters !== null && liters > 0 ? km / liters : null,
      });
    }
    anchor = i;
  });
  return segments;
}
/** Carry the same gauge AND odometer anchor over any unrecorded gauge readings. */
export function gaugeSegments(fills: readonly Fillup[], s: BikeSettings): Segment[] {
  const segments: Segment[] = [];
  let anchor: Fillup | null = null;
  let purchased = 0;
  let incomplete = false;
  for (const f of sortedFills(fills)) {
    if (anchor) {
      if (f.liters === null) incomplete = true;
      else purchased += f.liters;
    }
    if (f.gaugeLevel === null) continue;
    if (anchor && anchor.gaugeLevel !== null) {
      const burned = incomplete
        ? null
        : gaugeLiters(anchor.gaugeLevel, s) + purchased - gaugeLiters(f.gaugeLevel, s);
      const km =
        anchor.odometer !== null && f.odometer !== null ? f.odometer - anchor.odometer : null;
      segments.push({
        from: anchor,
        to: f,
        km,
        liters: burned,
        efficiency: km !== null && km > 0 && burned !== null && burned > 0 ? km / burned : null,
      });
    }
    anchor = f;
    purchased = 0;
    incomplete = false;
  }
  return segments;
}
export interface MonthStat {
  month: string;
  spend: number;
  liters: number;
  km: number | null;
  estimated: boolean;
}
export function statistics(fills: readonly Fillup[], settings: BikeSettings) {
  const rows = sortedFills(fills);
  const tanks = tankSegments(rows);
  const gauges = gaugeSegments(rows, settings);
  const measured = tanks.filter((s) => s.efficiency !== null);
  const gaugeRolling = rollingAverage(gauges.map((s) => s.efficiency));
  const gaugeEfficiency = [...gaugeRolling].reverse().find((v) => v !== null) ?? null;
  const efficiency = measured.length
    ? mean(measured.slice(-5).map((s) => s.efficiency!))
    : gaugeEfficiency;
  const readings = rows.filter((f) => f.odometer !== null);
  const totalDistance =
    readings.length >= 2 ? readings.at(-1)!.odometer! - readings[0].odometer! : null;
  const totalSpend = rows.reduce((sum, f) => sum + f.amount, 0);
  const totalLiters = rows.reduce((sum, f) => sum + (f.liters ?? 0), 0);
  const pricedFills = rows.filter((f) => f.liters !== null && f.liters > 0);
  const pricedSpend = pricedFills.reduce((sum, f) => sum + f.amount, 0);
  const latestMeasured = measured.at(-1);
  const costPerKm = tankPricePerKm(latestMeasured);
  const monthly = new Map<string, MonthStat>();
  const month = (f: Fillup) => {
    const key = f.dateTime.slice(0, 7);
    if (!monthly.has(key))
      monthly.set(key, { month: key, spend: 0, liters: 0, km: null, estimated: false });
    return monthly.get(key)!;
  };
  rows.forEach((f) => {
    const m = month(f);
    m.spend += f.amount;
    m.liters += f.liters ?? 0;
  });
  readings.forEach((f, i) => {
    if (i === 0) return;
    const delta = f.odometer! - readings[i - 1].odometer!;
    if (delta > 0) {
      const m = month(f);
      m.km = (m.km ?? 0) + delta;
    }
  });
  for (const m of monthly.values()) {
    if (m.km === null && m.liters > 0 && efficiency !== null) {
      m.km = m.liters * efficiency;
      m.estimated = true;
    }
  }
  return {
    rows,
    tanks,
    gauges,
    gaugeRolling,
    efficiency,
    method: measured.length ? ('tank' as const) : ('gauge' as const),
    totalDistance,
    totalSpend,
    totalLiters,
    pricePerLiter: totalLiters > 0 ? pricedSpend / totalLiters : null,
    costPerKm,
    last: rows.at(-1) ?? null,
    lastOdometer: readings.at(-1)?.odometer ?? null,
    months: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}
export function odometerError(fills: readonly Fillup[], candidate: Fillup): string | null {
  if (candidate.odometer === null) return null;
  const rows = sortedFills([...fills.filter((f) => f.id !== candidate.id), candidate]).filter(
    (f) => f.odometer !== null,
  );
  const i = rows.findIndex((f) => f.id === candidate.id);
  if (i > 0 && candidate.odometer <= rows[i - 1].odometer!)
    return 'Odometer must be higher than the previous reading (' + rows[i - 1].odometer + ' km).';
  if (i < rows.length - 1 && candidate.odometer >= rows[i + 1].odometer!)
    return 'Odometer must be lower than the next reading (' + rows[i + 1].odometer + ' km).';
  return null;
}
export function localDateTime(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    '-' +
    p(date.getMonth() + 1) +
    '-' +
    p(date.getDate()) +
    'T' +
    p(date.getHours()) +
    ':' +
    p(date.getMinutes())
  );
}
export function isoWithOffset(local: string): string {
  const d = new Date(local);
  if (!Number.isFinite(d.getTime())) throw new Error('Enter a valid date and time.');
  const offset = -d.getTimezoneOffset();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    local +
    ':00' +
    (offset >= 0 ? '+' : '-') +
    p(Math.floor(Math.abs(offset) / 60)) +
    ':' +
    p(Math.abs(offset) % 60)
  );
}
