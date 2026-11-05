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
import { project, rebase } from './offline';

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
  private channel?: BroadcastChannel;
  readonly online = signal(navigator.onLine);
  readonly syncing = signal(false);
  readonly remoteChecked = signal(false);
  readonly connectionError = signal('');
  readonly notice = signal('');
  readonly fills = computed(() => this.state().fills);
  readonly settings = computed(() => this.state().settings);
  readonly appearance = computed(() => this.state().appearance);
  readonly pending = computed(() => this.state().queue.length);
  readonly queue = computed(() => this.state().queue);
  readonly syncedAt = computed(() => this.state().syncedAt);
  readonly stats = computed(() => statistics(this.fills(), this.settings()));
  readonly rejected = computed(() => this.queue().find((q) => q.error));

  async init(): Promise<void> {
    await this.storage.create();
    const saved = (await this.storage.get('snapshot')) as Snapshot | null;
    if (saved?.version === 1) this.state.set(saved);
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
            this.state.set(latest);
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
  /** Web Locks serialize IndexedDB read-modify-write across tabs/PWA windows. */
  private commit(change: (state: Snapshot) => Snapshot): Promise<void> {
    const write = async () => {
      const persisted = (await this.storage.get('snapshot')) as Snapshot | null;
      const updated = change(persisted?.version === 1 ? persisted : this.state());
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
      this.syncing.set(false);
      this.remoteChecked.set(true);
    }
  }
  async retry(): Promise<void> {
    await this.commit((s) => ({ ...s, queue: s.queue.map((q) => ({ mutation: q.mutation })) }));
    await this.sync();
  }
}
