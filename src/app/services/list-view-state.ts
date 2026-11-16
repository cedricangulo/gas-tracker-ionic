import { Injectable, signal } from '@angular/core';

/** Per-session list navigation state, shared across pages destroyed while editing. */
@Injectable({ providedIn: 'root' })
export class ListViewState {
  readonly logLimit = signal(10);
  readonly mapLimit = signal(10);
  readonly mapGrade = signal<string | null>(null);
  logScrollTop = 0;
  mapScrollTop = 0;

  loadMore(view: 'log' | 'map', total: number): void {
    const limit = view === 'log' ? this.logLimit : this.mapLimit;
    limit.update((count) => Math.min(count + 10, total));
  }

  selectMapGrade(grade: string): void {
    if (grade === this.mapGrade()) return;
    this.mapGrade.set(grade);
    this.mapLimit.set(10);
    this.mapScrollTop = 0;
  }
}
