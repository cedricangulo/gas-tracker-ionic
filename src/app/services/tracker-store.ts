import { Injectable, computed, inject, signal } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import {
  Appearance,
  BikeSettings,
  Fillup,
  Mutation,
  Snapshot,
  emptySnapshot,
} from '../models/tracker';
import { statistics, odometerError } from '../models/math';
import { ApiError, ApiService } from './api';
import { project, rebase, withoutLegacyNotes } from './offline';

function mutationFillId(op: Mutation): string | null {
  return op.kind === 'settings' ? null : op.kind === 'delete' ? op.id : op.fill.id;
}
@Injectable({ providedIn: 'root' })
export class TrackerStore {
  private readonly storage = inject(Storage);
  private readonly api = inject(ApiService);
  private readonly state = signal<Snapshot>(emptySnapshot());
  private writes: Promise<void> = Promise.resolve();
  private flight: Promise<void> | null = null;
  private resyncRequested = false;
  private renamingStation = false;
  private activeStationRename: { from: string; to: string } | null = null;
  private channel?: BroadcastChannel;
  readonly online = signal(navigator.onLine);
  readonly syncing = signal(false);
  readonly remoteChecked = signal(false);
  readonly connectionError = signal('');
  readonly notice = signal('');
  readonly fills = computed(() => this.state().fills);
  readonly settings = computed(() => this.state().settings);
  readonly appearance = computed(() => this.state().appearance);
  readonly pending = computed(
    () => this.state().queue.length + (this.state().stationRename ? 1 : 0),
  );
  readonly queue = computed(() => this.state().queue);
  readonly syncedAt = computed(() => this.state().syncedAt);
  readonly stats = computed(() => statistics(this.fills(), this.settings()));
  readonly rejected = computed(() => this.queue().find((q) => q.error));

  async init(): Promise<void> {
    await this.storage.create();
    await this.commit((state) => state);
    this.applyAppearance();
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => this.applyAppearance());
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('gas-tracker-snapshot');
      this.channel.onmessage = () => {
        const read = async () => {
          const latest = (await this.storage.get('snapshot')) as Snapshot | null;
          if (latest?.version === 1) {
            this.state.set(this.applyStationRename(withoutLegacyNotes(latest)));
            this.applyAppearance();
          }
        };
        this.writes = this.writes
          .catch(() => undefined)
          .then(async () => {
            if (navigator.locks) await navigator.locks.request('gas-tracker-snapshot', read);
            else await read();
          });
      };
    }
    window.addEventListener('online', () => {
      this.online.set(true);
      void this.sync();
    });
    window.addEventListener('offline', () => this.online.set(false));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void this.sync();
    });
    void this.sync();
  }
  /** Only runs while the rename owns the sync lock: these queued requests are still unsent. */
  private applyStationRename(state: Snapshot): Snapshot {
    const rename = this.activeStationRename;
    if (!rename) return state;
    const name = (station: string | null) => (station === rename.from ? rename.to : station);
    const settings = (value: BikeSettings): BikeSettings => ({
      ...value,
      stations: [...new Set(value.stations.map((station) => name(station)!))],
    });
    const mutation = (value: Mutation): Mutation => {
      if (value.kind === 'settings') return { ...value, settings: settings(value.settings) };
      if (value.kind === 'create' || value.kind === 'update')
        return { ...value, fill: { ...value.fill, station: name(value.fill.station) } };
      return value;
    };
    return {
      ...state,
      settings: settings(state.settings),
      fills: state.fills.map((fill) => ({ ...fill, station: name(fill.station) })),
      queue: state.queue.map((item) => ({ ...item, mutation: mutation(item.mutation) })),
    };
  }
  /** Web Locks serialize IndexedDB read-modify-write across tabs/PWA windows. */
  private commit(change: (state: Snapshot) => Snapshot): Promise<void> {
    const write = async () => {
      const persisted = (await this.storage.get('snapshot')) as Snapshot | null;
      const current = this.applyStationRename(
        persisted?.version === 1 ? withoutLegacyNotes(persisted) : this.state(),
      );
      const updated = withoutLegacyNotes(this.applyStationRename(change(current)));
      await this.storage.set('snapshot', updated);
      this.state.set(updated);
      this.channel?.postMessage('updated');
    };
    const next = this.writes
      .catch(() => undefined)
      .then(async () => {
        if (navigator.locks) await navigator.locks.request('gas-tracker-snapshot', write);
        else await write();
      });
    this.writes = next;
    return next;
  }
  private async enqueue(mutation: Mutation): Promise<void> {
    if (this.renamingStation) throw new Error('Wait for the station rename to finish.');
    await this.commit((state) => {
      if (mutation.kind === 'create' || mutation.kind === 'update') {
        const error = odometerError(state.fills, mutation.fill);
        if (error) throw new Error(error);
      }
      const incomingSettings = mutation.kind === 'settings' ? mutation.settings : null;
      if (
        incomingSettings &&
        state.fills.some(
          (f) => f.gaugeLevel !== null && f.gaugeLevel > incomingSettings.gaugeSegments,
        )
      )
        throw new Error(
          'A saved fill-up has more gauge bars. Correct it before reducing segments.',
        );
      const failed = state.queue.findIndex(
        (q) =>
          q.error &&
          ((mutation.kind === 'settings' && q.mutation.kind === 'settings') ||
            (mutationFillId(mutation) !== null &&
              mutationFillId(q.mutation) === mutationFillId(mutation))),
      );
      let queue = [...state.queue];
      if (failed >= 0) {
        const previous = queue[failed].mutation;
        if (
          (mutation.kind === 'create' || mutation.kind === 'update') &&
          (previous.kind === 'create' || previous.kind === 'update')
        )
          mutation = { ...mutation, kind: previous.kind };
        queue[failed] = { mutation };
        // A corrected draft supersedes older queued drafts of the same entity.
        queue = queue.filter(
          (q, index) =>
            index <= failed ||
            (mutation.kind === 'settings'
              ? q.mutation.kind !== 'settings'
              : mutationFillId(q.mutation) !== mutationFillId(mutation)),
        );
      } else queue.push({ mutation });
      return { ...project(state, mutation), queue };
    });
    void this.sync();
  }
  async saveFill(fill: Fillup, editing: boolean): Promise<void> {
    await this.enqueue({
      operationId: crypto.randomUUID(),
      kind: editing ? 'update' : 'create',
      fill,
    });
    this.notice.set('Fill-up saved on this device.');
  }
  async deleteFill(id: string): Promise<void> {
    const mutation: Mutation = { operationId: crypto.randomUUID(), kind: 'delete', id };
    await this.commit((state) => ({
      ...project(state, mutation),
      queue: [
        ...state.queue.filter(
          (q) => mutationFillId(q.mutation) !== id || (q.mutation.kind === 'create' && !q.error),
        ),
        { mutation },
      ],
    }));
    // Preserve uncertain creates: replaying their receipt settles creation before deletion.
    void this.sync();
    this.notice.set('Fill-up deleted on this device.');
  }
  async saveSettings(settings: BikeSettings): Promise<void> {
    await this.enqueue({ operationId: crypto.randomUUID(), kind: 'settings', settings });
    this.notice.set('Bike settings saved.');
  }
  private stationName(value: string): string {
    const name = value.trim();
    if (!name || new TextEncoder().encode(name).length > 80)
      throw new Error('Enter a shorter station name, or enter one if blank.');
    return name;
  }
  async addStation(value: string): Promise<void> {
    const name = this.stationName(value);
    const settings = this.settings();
    if (settings.stations.some((station) => station.toLowerCase() === name.toLowerCase()))
      throw new Error('A station with that name already exists.');
    if (settings.stations.length >= 100) throw new Error('You can save up to 100 stations.');
    await this.saveSettings({ ...settings, stations: [...settings.stations, name] });
    this.notice.set('Station added.');
  }
  async archiveStation(name: string): Promise<void> {
    const settings = this.settings();
    await this.saveSettings({
      ...settings,
      stations: settings.stations.filter((station) => station !== name),
    });
    this.notice.set('Station archived. Past fill-ups are kept.');
  }
  async renameStation(
    from: string,
    value: string,
    operationId: string = crypto.randomUUID(),
  ): Promise<void> {
    const to = this.stationName(value);
    if (!navigator.onLine) throw new Error('Connect to rename a station.');
    if (this.renamingStation) throw new Error('Wait for the station rename to finish.');
    this.renamingStation = true;
    try {
      await this.sync();
      // Wait for any follow-up sync before installing the rename as the current flight.
      while (this.flight) await this.flight;
      if (this.state().stationRename && this.connectionError())
        throw new ApiError(this.connectionError(), 0);
      const rename = async () => {
        await this.commit((state) => state);
        if (this.pending() || this.connectionError())
          throw new Error('Finish saving pending changes before renaming a station.');
        await this.commit((state) => ({ ...state, stationRename: { from, to, operationId } }));
        try {
          await this.settleStationRename();
          await this.performSync();
        } finally {
          this.activeStationRename = null;
        }
        this.notice.set('Station renamed.');
      };
      this.resyncRequested = false;
      const execute = async (): Promise<void> => {
        if (navigator.locks) await navigator.locks.request('gas-tracker-sync', rename);
        else await rename();
      };
      this.flight = execute().finally(() => {
        this.flight = null;
        const again = this.resyncRequested;
        this.resyncRequested = false;
        if (again && navigator.onLine && !this.rejected()) return this.sync();
        return undefined;
      });
      await this.flight;
    } finally {
      this.renamingStation = false;
    }
  }
  /** Confirm an interrupted online rename before replaying any later station drafts. */
  private async settleStationRename(): Promise<void> {
    const rename = this.state().stationRename;
    if (!rename) return;
    try {
      await this.api.renameStation(rename.from, rename.to, rename.operationId);
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500)
        await this.commit((state) => ({ ...state, stationRename: undefined }));
      throw error;
    }
    this.activeStationRename = rename;
    try {
      await this.commit((state) => ({ ...state, stationRename: undefined }));
    } catch {
      throw new ApiError('Rename saved. Retry the same name or refresh to update this device.', 0);
    }
  }
  async setAppearance(appearance: Appearance): Promise<void> {
    await this.commit((s) => ({ ...s, appearance }));
    this.applyAppearance();
  }
  private applyAppearance(): void {
    const night =
      this.appearance() === 'night' ||
      (this.appearance() === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('night', night);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', night ? '#0E0F10' : '#E2E3E3');
  }
  isPending(id: string): boolean {
    return this.queue().some((q) => mutationFillId(q.mutation) === id);
  }
  sync(): Promise<void> {
    if (this.flight) {
      this.resyncRequested = true;
      return this.flight;
    }
    this.resyncRequested = false;
    this.flight = this.serializedSync().finally(() => {
      this.flight = null;
      const again = this.resyncRequested;
      this.resyncRequested = false;
      if (again && navigator.onLine && !this.rejected()) return this.sync();
      return undefined;
    });
    return this.flight;
  }
  private async serializedSync(): Promise<void> {
    if (navigator.onLine && navigator.locks) {
      await navigator.locks.request('gas-tracker-sync', async () => {
        await this.performSync();
      });
    } else await this.performSync();
  }
  private async performSync(): Promise<void> {
    if (!navigator.onLine) {
      this.online.set(false);
      this.remoteChecked.set(true);
      return;
    }
    this.syncing.set(true);
    this.connectionError.set('');
    try {
      // Refresh the current queue under the same lock used by other app windows.
      await this.commit((s) => s);
      await this.settleStationRename();
      while (this.queue().length) {
        const item = this.queue()[0];
        if (item.error) break;
        try {
          await this.api.mutate(item.mutation);
        } catch (error) {
          const absentDelete =
            item.mutation.kind === 'delete' && error instanceof ApiError && error.status === 404;
          const obsoleteCreation =
            item.mutation.kind === 'create' &&
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500 &&
            this.queue().some(
              (q) =>
                q.mutation.kind === 'delete' && q.mutation.id === mutationFillId(item.mutation),
            );
          if (!absentDelete && !obsoleteCreation) {
            if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
              await this.commit((s) => ({
                ...s,
                queue: s.queue.map((q) =>
                  q.mutation.operationId === item.mutation.operationId
                    ? { ...q, error: error.message }
                    : q,
                ),
              }));
            }
            throw error;
          }
        }
        await this.commit((s) => ({
          ...s,
          queue: s.queue.filter((q) => q.mutation.operationId !== item.mutation.operationId),
        }));
      }
      const [fills, settings] = await Promise.all([this.api.fills(), this.api.settings()]);
      await this.commit((s) => ({
        ...rebase(s, fills, settings),
        syncedAt: new Date().toISOString(),
      }));
      this.online.set(true);
    } catch (error) {
      this.connectionError.set(
        error instanceof Error
          ? error.message
          : 'Could not synchronize. Your local changes are safe.',
      );
    } finally {
      this.activeStationRename = null;
      this.syncing.set(false);
      this.remoteChecked.set(true);
    }
  }
  async retry(): Promise<void> {
    await this.commit((s) => ({ ...s, queue: s.queue.map((q) => ({ mutation: q.mutation })) }));
    await this.sync();
  }
}
