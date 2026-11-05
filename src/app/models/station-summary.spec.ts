import { StationSummary as Summary } from './station-summary';
import { Fillup } from './tracker';

const base: Fillup = {
  id: 'a',
  amount: 100,
  liters: 2,
  odometer: 100,
  dateTime: '2026-07-01T12:00:00+08:00',
  station: 'Uno',
  grade: 'Unleaded',
  latitude: 0,
  longitude: 0,
  gaugeLevel: 3,
  filledToFull: false,
  notes: '',
  createdAt: 1,
};
const fill = (id: string, changes: Partial<Fillup> = {}): Fillup => ({ ...base, id, ...changes });

describe('StationSummary', () => {
  it('groups normalized names within 100 metres while retaining separate names and branches', () => {
    const groups = Summary.group([
      fill('b', { station: ' UNO ', latitude: 0.0008, createdAt: 2 }),
      base,
      fill('c', { latitude: 0.0016, createdAt: 3 }),
      fill('d', { station: 'Petron' }),
    ]);
    expect(groups).toHaveLength(3);
    expect(groups.find((g) => g.id === 'a')?.fills.map((f) => f.id)).toEqual(['a', 'b']);
    expect(groups.find((g) => g.id === 'c')?.latitude).toBe(0.0016);
  });
  it('uses the earliest dated visit as anchor regardless of input order or grade', () => {
    const old = fill('old', { dateTime: '2026-06-01T12:00:00+08:00', grade: 'Premium' });
    const groups = Summary.group([fill('new', { latitude: 0.0007 }), old]);
    expect(groups[0].id).toBe('old');
    expect(groups[0].latitude).toBe(0);
    expect(groups[0].fills.map((f) => f.id)).toEqual(['old', 'new']);
  });
  it('groups unnamed stops by proximity and excludes missing or invalid coordinates', () => {
    const groups = Summary.group([
      fill('a', { station: null }),
      fill('b', { station: ' ', latitude: 0.0001 }),
      fill('c', { latitude: null }),
      fill('d', { longitude: NaN }),
      fill('e', { latitude: 91 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Unnamed stop');
    expect(groups[0].fills).toHaveLength(2);
  });
  it('deduplicates grades and defaults to Unleaded, then the first available named grade', () => {
    const options = Summary.grades([
      fill('p', { grade: 'Premium' }),
      fill('u', { grade: ' Unleaded ' }),
      fill('u2', { grade: 'UNLEADED' }),
      fill('n', { grade: null }),
    ]);
    expect(options.map((g) => g.key)).toEqual(['premium', 'unleaded', '']);
    expect(Summary.defaultGrade(options)).toBe('unleaded');
    expect(Summary.defaultGrade(options.filter((g) => g.key !== 'unleaded'))).toBe('premium');
    expect(Summary.defaultGrade([])).toBe('');
  });
  it('uses the first recorded named grade rather than alphabetical order when Unleaded is absent', () => {
    const options = Summary.grades([
      fill('diesel', { grade: 'Diesel', dateTime: '2026-08-01T12:00:00+08:00' }),
      fill('premium', { grade: 'Premium', dateTime: '2026-06-01T12:00:00+08:00' }),
    ]);
    expect(Summary.defaultGrade(options)).toBe('premium');
  });
  it('weights by liters, excludes unpriced visits, and distinguishes latest price from last visit', () => {
    const groups = Summary.group([
      fill('a', { amount: 100, liters: 1 }),
      fill('b', { amount: 900, liters: 3, dateTime: '2026-07-02T12:00:00+08:00' }),
      fill('c', { amount: 500, liters: null, dateTime: '2026-07-03T12:00:00+08:00' }),
    ]);
    const [station] = Summary.compare(groups, 'unleaded');
    expect(station.averagePrice).toBe(250);
    expect(station.latestPrice).toBe(300);
    expect(station.latestPriceDate).toBe('2026-07-02T12:00:00+08:00');
    expect(station.lastVisit).toBe('2026-07-03T12:00:00+08:00');
    expect(station.visitCount).toBe(3);
    expect(station.pricedCount).toBe(2);
  });
  it('keeps grades separate and never recommends an ungraded price', () => {
    const groups = Summary.group([
      base,
      fill('p', { grade: 'Premium', amount: 200 }),
      fill('n', { grade: null, amount: 1 }),
    ]);
    expect(Summary.compare(groups, 'unleaded')[0].averagePrice).toBe(50);
    expect(Summary.compare(groups, 'premium')[0].averagePrice).toBe(100);
    const [unknown] = Summary.compare(groups, '');
    expect(unknown.visitCount).toBe(1);
    expect(unknown.isLowest).toBe(false);
    expect(Summary.compare(groups, 'diesel')).toEqual([]);
  });
  it('sorts by weighted average with missing prices last and flags ties at displayed cents', () => {
    const stations = Summary.compare(
      Summary.group([
        fill('missing', { station: 'Missing', liters: null }),
        fill('expensive', { station: 'Expensive', amount: 110 }),
        fill('a', { station: 'A', amount: 100.001 }),
        fill('b', { station: 'B', amount: 100.008 }),
      ]),
      'unleaded',
    );
    expect(stations.map((s) => s.name)).toEqual(['A', 'B', 'Expensive', 'Missing']);
    expect(stations.map((s) => s.isLowest)).toEqual([true, true, false, false]);
    expect(stations[3].latestPrice).toBeNull();
    expect(stations[3].pricedCount).toBe(0);
  });
  it('does not rank zero/invalid liters and flags test data only within the selected grade', () => {
    const groups = Summary.group([
      fill('a', { liters: 0 }),
      fill('b', { liters: NaN }),
      fill('p', { grade: 'Premium', notes: 'Manual testing seed. Synthetic: station.' }),
    ]);
    const [unleaded] = Summary.compare(groups, 'unleaded');
    expect(unleaded.averagePrice).toBeNull();
    expect(unleaded.isLowest).toBe(false);
    expect(unleaded.includesTestData).toBe(false);
    expect(Summary.compare(groups, 'premium')[0].includesTestData).toBe(true);
  });
  it('handles empty datasets without a recommendation', () => {
    expect(Summary.group([])).toEqual([]);
    expect(Summary.grades([])).toEqual([]);
    expect(Summary.compare([], '')).toEqual([]);
  });
});
