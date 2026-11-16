export type Appearance = 'auto' | 'day' | 'night';
export interface BikeSettings {
  name: string;
  tankCapacity: number;
  gaugeSegments: number;
  lowFuelAnchor: number;
  factoryWMTC: number;
  stations: string[];
  grades: string[];
}
export interface Fillup {
  id: string;
  amount: number;
  liters: number | null;
  odometer: number | null;
  dateTime: string;
  station: string | null;
  grade: string | null;
  /** Gauge immediately AFTER filling. Zero = E; null = not recorded. */
  gaugeLevel: number | null;
  filledToFull: boolean;
  latitude: number | null;
  longitude: number | null;

  createdAt: number;
}
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
}
export type Mutation =
  | { operationId: string; kind: 'create' | 'update'; fill: Fillup }
  | { operationId: string; kind: 'delete'; id: string }
  | { operationId: string; kind: 'settings'; settings: BikeSettings };
export interface QueuedMutation {
  mutation: Mutation;
  error?: string;
}
export interface Snapshot {
  version: 1;
  stationRename?: { from: string; to: string; operationId: string };
  fills: Fillup[];
  settings: BikeSettings;
  appearance: Appearance;
  queue: QueuedMutation[];
  syncedAt: string | null;
}
export const DEFAULT_SETTINGS: BikeSettings = {
  name: 'Honda Click 125i V4',
  tankCapacity: 5.5,
  gaugeSegments: 6,
  lowFuelAnchor: 1.2,
  factoryWMTC: 50,
  stations: ['Uno', 'Shell', 'Petron', 'Caltex', 'Cleanfuel'],
  grades: ['Unleaded', 'Premium'],
};
export function emptySnapshot(): Snapshot {
  return {
    version: 1,
    fills: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    appearance: 'day',
    queue: [],
    syncedAt: null,
  };
}
