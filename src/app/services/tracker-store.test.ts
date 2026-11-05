import '@angular/compiler';
import { Injector } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { TrackerStore } from './tracker-store';
import { ApiService, ApiError } from './api';
import { DEFAULT_SETTINGS, emptySnapshot, Fillup, Snapshot } from '../models/tracker';

const fill: Fillup = {
  id: 'one',
  amount: 100,
  liters: 2,
  odometer: 100,
  dateTime: '2026-11-06T12:00:00+08:00',
  station: null,
  grade: null,
  gaugeLevel: 3,
  filledToFull: false,
  latitude: null,
  longitude: null,
  notes: '',
  createdAt: 1,
};
function harness(initial?: Snapshot) {
  let disk = initial ? structuredClone(initial) : null;
  const storage = {
    create: vi.fn(async () => storage),
    get: vi.fn(async () => (disk ? structuredClone(disk) : null)),
    set: vi.fn(async (_key: string, value: Snapshot) => {
      disk = structuredClone(value);
    }),
  };
  const api = {
    fills: vi.fn(async (): Promise<Fillup[]> => []),
    settings: vi.fn(async () => structuredClone(DEFAULT_SETTINGS)),
    mutate: vi.fn(async (_op: unknown): Promise<void> => undefined),
  };
  const injector = Injector.create({
    providers: [
      TrackerStore,
      { provide: Storage, useValue: storage },
      { provide: ApiService, useValue: api },
    ],
  });
  return { store: injector.get(TrackerStore), api, storage, disk: () => disk };
}
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: false });
  const media = { matches: false, addEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal('window', { matchMedia: () => media, addEventListener: vi.fn() });
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: vi.fn(),
    documentElement: { classList: { toggle: vi.fn() } },
    querySelector: () => null,
  });
});
afterEach(() => vi.unstubAllGlobals());
describe('durable offline saves', () => {
  it('persists a fill and its outbox entry atomically before reporting success', async () => {
    const h = harness();
    await h.store.init();
    await h.store.saveFill(fill, false);
    expect(h.disk()?.fills).toEqual([fill]);
    expect(h.disk()?.queue).toHaveLength(1);
    expect(h.api.mutate).not.toHaveBeenCalled();
    expect(h.store.pending()).toBe(1);
  });
  it('does not show an unpersisted fill when storage fails', async () => {
    const h = harness();
    await h.store.init();
    h.storage.set.mockRejectedValueOnce(new Error('Disk full'));
    await expect(h.store.saveFill(fill, false)).rejects.toThrow('Disk full');
    expect(h.store.fills()).toEqual([]);
    expect(h.store.pending()).toBe(0);
  });
  it('recovers both records and pending operations after restarting', async () => {
    const h = harness();
    await h.store.init();
    await h.store.saveFill(fill, false);
    const restarted = harness(h.disk()!);
    await restarted.store.init();
    expect(restarted.store.fills()).toEqual([fill]);
    expect(restarted.store.pending()).toBe(1);
  });
  it('serializes rapid consecutive offline changes without losing either', async () => {
    const h = harness();
    await h.store.init();
    await Promise.all([
      h.store.saveFill(fill, false),
      h.store.saveFill({ ...fill, id: 'two', odometer: null, createdAt: 2 }, false),
    ]);
    expect(h.store.fills()).toHaveLength(2);
    expect(h.store.pending()).toBe(2);
  });
});
describe('synchronization failures and recovery', () => {
  it('retains the same operation ID after an interrupted response', async () => {
    const h = harness();
    await h.store.init();
    await h.store.saveFill(fill, false);
    const id = h.store.queue()[0].mutation.operationId;
    h.api.mutate.mockRejectedValueOnce(new ApiError('Connection lost', 0));
    vi.stubGlobal('navigator', { onLine: true });
    await h.store.sync();
    expect(h.store.pending()).toBe(1);
    expect(h.store.queue()[0].mutation.operationId).toBe(id);
    h.api.fills.mockResolvedValue([fill]);
    await h.store.sync();
    expect(h.api.mutate.mock.calls[0][0]).toEqual(h.api.mutate.mock.calls[1][0]);
    expect(h.store.pending()).toBe(0);
    expect(h.store.fills()).toEqual([fill]);
  });
  it('keeps a validation rejection visible and allows correcting the rejected creation', async () => {
    const h = harness();
    await h.store.init();
    await h.store.saveFill(fill, false);
    h.api.mutate.mockRejectedValueOnce(new ApiError('Wrong odometer', 422));
    vi.stubGlobal('navigator', { onLine: true });
    await h.store.sync();
    expect(h.store.rejected()?.error).toBe('Wrong odometer');
    vi.stubGlobal('navigator', { onLine: false });
    await h.store.saveFill({ ...fill, odometer: null }, true);
    expect(h.store.queue()).toHaveLength(1);
    expect(h.store.queue()[0].error).toBeUndefined();
    expect(h.store.queue()[0].mutation.kind).toBe('create');
  });
  it('does not overwrite an offline edit with a stale GET response', async () => {
    const h = harness();
    await h.store.init();
    const response = deferred<Fillup[]>();
    h.api.fills.mockReturnValueOnce(response.promise);
    vi.stubGlobal('navigator', { onLine: true });
    const sync = h.store.sync();
    vi.stubGlobal('navigator', { onLine: false });
    await h.store.saveFill({ ...fill, amount: 250 }, true);
    response.resolve([fill]);
    await sync;
    expect(h.store.fills()[0].amount).toBe(250);
    expect(h.store.pending()).toBe(1);
  });
});

describe('review regressions', () => {
  it('drains an online save created while a refresh GET is in progress', async () => {
    const h = harness();
    await h.store.init();
    const started = deferred<void>();
    const response = deferred<Fillup[]>();
    h.api.fills
      .mockImplementationOnce(() => {
        started.resolve();
        return response.promise;
      })
      .mockResolvedValue([fill]);
    vi.stubGlobal('navigator', { onLine: true });
    const refreshing = h.store.sync();
    await started.promise;
    await h.store.saveFill(fill, false);
    response.resolve([]);
    await refreshing;
    await h.store.sync();
    expect(h.api.mutate).toHaveBeenCalled();
    expect(h.store.pending()).toBe(0);
    expect(h.store.fills()).toEqual([fill]);
  });
  it('deleting a rejected local creation unblocks the queue, settling an absent remote ID', async () => {
    const initial = emptySnapshot();
    initial.fills = [fill];
    initial.queue = [
      { mutation: { operationId: 'failed', kind: 'create', fill }, error: 'Invalid entry' },
    ];
    const h = harness(initial);
    await h.store.init();
    await h.store.deleteFill(fill.id);
    expect(h.store.rejected()).toBeUndefined();
    expect(h.store.queue()[0].mutation.kind).toBe('delete');
    h.api.mutate.mockRejectedValueOnce(new ApiError('Not found', 404));
    vi.stubGlobal('navigator', { onLine: true });
    await h.store.sync();
    expect(h.store.pending()).toBe(0);
    expect(h.store.fills()).toEqual([]);
  });
  it('a corrected rejected draft supersedes older queued edits', async () => {
    const initial = emptySnapshot();
    initial.fills = [fill];
    initial.queue = [
      { mutation: { operationId: 'failed', kind: 'create', fill }, error: 'Invalid entry' },
      { mutation: { operationId: 'stale-edit', kind: 'update', fill: { ...fill, amount: 150 } } },
    ];
    const h = harness(initial);
    await h.store.init();
    await h.store.saveFill({ ...fill, amount: 300 }, true);
    expect(h.store.queue()).toHaveLength(1);
    const op = h.store.queue()[0].mutation;
    expect(op.kind).toBe('create');
    expect('fill' in op ? op.fill.amount : 0).toBe(300);
  });
  it('two app instances preserve each others durable changes through the shared lock', async () => {
    let chain = Promise.resolve();
    vi.stubGlobal('navigator', {
      onLine: false,
      locks: {
        request: (_name: string, task: () => Promise<void>) => {
          const next = chain.then(task);
          chain = next.catch(() => undefined);
          return next;
        },
      },
    });
    const h = harness();
    await h.store.init();
    const second = Injector.create({
      providers: [
        TrackerStore,
        { provide: Storage, useValue: h.storage },
        { provide: ApiService, useValue: h.api },
      ],
    }).get(TrackerStore);
    await second.init();
    await Promise.all([
      h.store.saveFill(fill, false),
      second.saveFill({ ...fill, id: 'two', odometer: null, createdAt: 2 }, false),
    ]);
    expect(h.disk()?.fills).toHaveLength(2);
    expect(h.disk()?.queue).toHaveLength(2);
  });
});

describe('delete and cross-window ordering', () => {
  it('keeps the original uncertain create receipt ahead of an offline deletion', async () => {
    const h = harness();
    await h.store.init();
    await h.store.saveFill(fill, false);
    const original = h.store.queue()[0].mutation.operationId;
    await h.store.deleteFill(fill.id);
    expect(h.store.queue().map((q) => q.mutation.kind)).toEqual(['create', 'delete']);
    expect(h.store.queue()[0].mutation.operationId).toBe(original);
    h.api.mutate
      .mockRejectedValueOnce(new ApiError('Invalid creation', 422))
      .mockRejectedValueOnce(new ApiError('Already absent', 404));
    vi.stubGlobal('navigator', { onLine: true });
    await h.store.sync();
    expect(h.store.pending()).toBe(0);
    expect(h.store.rejected()).toBeUndefined();
    expect(h.store.fills()).toEqual([]);
  });
  it('serializes creation and deletion across windows so an in-flight create cannot resurrect a deleted fill', async () => {
    const chains = new Map<string, Promise<void>>();
    const locks = {
      request: (name: string, task: () => Promise<void>) => {
        const next = (chains.get(name) ?? Promise.resolve()).then(task);
        chains.set(
          name,
          next.catch(() => undefined),
        );
        return next;
      },
    };
    vi.stubGlobal('navigator', { onLine: false, locks });
    const h = harness();
    await h.store.init();
    await h.store.saveFill(fill, false);
    const second = Injector.create({
      providers: [
        TrackerStore,
        { provide: Storage, useValue: h.storage },
        { provide: ApiService, useValue: h.api },
      ],
    }).get(TrackerStore);
    await second.init();
    let server: Fillup[] = [];
    const started = deferred<void>();
    const release = deferred<void>();
    h.api.mutate.mockImplementation(async (raw) => {
      const op = raw as { kind: string };
      if (op.kind === 'create') {
        started.resolve();
        await release.promise;
        server = [fill];
      }
      if (op.kind === 'delete') server = [];
    });
    h.api.fills.mockImplementation(async () => structuredClone(server));
    vi.stubGlobal('navigator', { onLine: true, locks });
    const saving = h.store.sync();
    await started.promise;
    await second.deleteFill(fill.id);
    release.resolve();
    await saving;
    await second.sync();
    expect(server).toEqual([]);
    expect(h.disk()?.fills).toEqual([]);
    expect(h.disk()?.queue).toEqual([]);
  });
});
