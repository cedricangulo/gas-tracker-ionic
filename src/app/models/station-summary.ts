import { Fillup } from './tracker';
import { compareFills } from './math';

export interface GradeOption {
  key: string;
  label: string;
}
export interface StationGroup {
  id: string;
  name: string;
  nameKey: string;
  latitude: number;
  longitude: number;
  fills: Fillup[];
}
export interface StationComparison extends StationGroup {
  averagePrice: number | null;
  latestPrice: number | null;
  latestPriceDate: string | null;
  lastVisit: string;
  visitCount: number;
  pricedCount: number;

  isLowest: boolean;
}

/** Pure station grouping and price summaries; no Leaflet or persistence dependencies. */
export class StationSummary {
  static key(value: string | null): string {
    return value?.trim().toLowerCase() ?? '';
  }

  static hasLocation(fill: Fillup): boolean {
    return (
      fill.latitude !== null &&
      Number.isFinite(fill.latitude) &&
      Math.abs(fill.latitude) <= 90 &&
      fill.longitude !== null &&
      Number.isFinite(fill.longitude) &&
      Math.abs(fill.longitude) <= 180
    );
  }

  private static distance(a: StationGroup, fill: Fillup): number {
    const radians = Math.PI / 180;
    const dLat = (fill.latitude! - a.latitude) * radians;
    const dLng = (fill.longitude! - a.longitude) * radians;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a.latitude * radians) * Math.cos(fill.latitude! * radians) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }

  static group(fills: readonly Fillup[]): StationGroup[] {
    const groups: StationGroup[] = [];
    for (const fill of [...fills].filter(this.hasLocation).sort(compareFills)) {
      const nameKey = this.key(fill.station);
      const group = groups.find((g) => g.nameKey === nameKey && this.distance(g, fill) <= 100);
      if (group) group.fills.push(fill);
      else
        groups.push({
          id: fill.id,
          name: fill.station?.trim() || 'Unnamed stop',
          nameKey,
          latitude: fill.latitude!,
          longitude: fill.longitude!,
          fills: [fill],
        });
    }
    return groups;
  }

  static grades(fills: readonly Fillup[]): GradeOption[] {
    const options = new Map<string, string>();
    for (const fill of [...fills].filter(this.hasLocation).sort(compareFills)) {
      const key = this.key(fill.grade);
      if (!options.has(key)) options.set(key, fill.grade?.trim() || 'Not recorded');
    }
    return [...options]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : 0));
  }

  static defaultGrade(options: readonly GradeOption[]): string {
    return options.find((g) => g.key === 'unleaded')?.key ?? options[0]?.key ?? '';
  }

  static compare(groups: readonly StationGroup[], grade: string): StationComparison[] {
    const result: StationComparison[] = [];
    for (const group of groups) {
      const fills = group.fills.filter((f) => this.key(f.grade) === grade);
      if (!fills.length) continue;
      const priced = fills.filter(
        (f) =>
          f.liters !== null &&
          Number.isFinite(f.liters) &&
          f.liters > 0 &&
          Number.isFinite(f.amount) &&
          f.amount > 0,
      );
      const totalLiters = priced.reduce((sum, f) => sum + f.liters!, 0);
      const latest = priced.at(-1);
      result.push({
        ...group,
        fills,
        averagePrice: priced.length
          ? priced.reduce((sum, f) => sum + f.amount, 0) / totalLiters
          : null,
        latestPrice: latest ? latest.amount / latest.liters! : null,
        latestPriceDate: latest?.dateTime ?? null,
        lastVisit: fills.at(-1)!.dateTime,
        visitCount: fills.length,
        pricedCount: priced.length,

        isLowest: false,
      });
    }
    result.sort(
      (a, b) =>
        (a.averagePrice ?? Infinity) - (b.averagePrice ?? Infinity) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
    const lowest = result.find((s) => s.averagePrice !== null)?.averagePrice;
    for (const station of result)
      station.isLowest =
        grade !== '' &&
        station.averagePrice !== null &&
        lowest != null &&
        Math.round(station.averagePrice * 100) === Math.round(lowest * 100);
    return result;
  }
}
