import { computed, signal } from '@angular/core';
import { vi } from 'vitest';
import { DEFAULT_SETTINGS, BikeSettings, Fillup, QueuedMutation } from '../models/tracker';
import { statistics } from '../models/math';
export const exampleFill: Fillup = {
  id: 'b7724ad8-13a5-4396-8423-ddbf4ba130ad',
  amount: 200,
  liters: 4,
  odometer: 1000,
  dateTime: '2026-11-06T10:00:00+08:00',
  station: 'Uno',
  grade: 'Unleaded',
  gaugeLevel: 6,
  filledToFull: true,
  latitude: 14.5995,
  longitude: 120.9842,
  notes: '',
  createdAt: 1,
};
export function createTestStore() {
  const fills = signal<Fillup[]>([]);
  const settings = signal<BikeSettings>(structuredClone(DEFAULT_SETTINGS));
  const store = {
    fills,
    settings,
    stats: computed(() => statistics(fills(), settings())),
    appearance: signal<'auto' | 'day' | 'night'>('day'),
    pending: signal(0),
    online: signal(true),
    queue: signal<QueuedMutation[]>([]),
    syncing: signal(false),
    remoteChecked: signal(true),
    connectionError: signal(''),
    rejected: signal<QueuedMutation | undefined>(undefined),
    notice: signal(''),
    syncedAt: signal<string | null>(null),
    isPending: vi.fn(() => false),
    saveFill: vi.fn(async (_fill: Fillup, _editing: boolean) => undefined),
    deleteFill: vi.fn(async (_id: string) => undefined),
    saveSettings: vi.fn(async (value: BikeSettings) => {
      settings.set(value);
    }),
    setAppearance: vi.fn(async (value: 'auto' | 'day' | 'night') => {
      store.appearance.set(value);
    }),
    sync: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
  };
  return store;
}
export type TestStore = ReturnType<typeof createTestStore>;
