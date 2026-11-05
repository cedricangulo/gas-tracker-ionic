import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  AlertController,
} from '@ionic/angular/standalone';
import { TrackerStore } from '../../services/tracker-store';
import { GeoService } from '../../services/geo';
import { GaugeComponent } from '../../components/gauge/gauge.component';
import { SyncBannerComponent } from '../../components/sync-banner/sync-banner.component';
import { ListViewState } from '../../services/list-view-state';
import { Fillup } from '../../models/tracker';
@Component({
  selector: 'app-log',
  standalone: true,
  templateUrl: './log.page.html',
  styleUrls: ['./log.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    GaugeComponent,
    SyncBannerComponent,
  ],
})
export class LogPage {
  readonly store = inject(TrackerStore);
  private readonly listState = inject(ListViewState);
  @ViewChild(IonContent) private content?: IonContent;
  private readonly geo = inject(GeoService);
  private readonly alerts = inject(AlertController);
  readonly busy = signal<string | null>(null);
  readonly rows = computed(() => {
    let previous: number | null = null;
    return this.store
      .stats()
      .rows.map((fill) => {
        const distance =
          fill.odometer !== null && previous !== null ? fill.odometer - previous : null;
        if (fill.odometer !== null) previous = fill.odometer;
        return { fill, distance };
      })
      .reverse();
  });
  readonly visibleRows = computed(() => this.rows().slice(0, this.listState.logLimit()));
  loadMore(): void {
    this.listState.loadMore('log', this.rows().length);
  }
  rememberScroll(event: Event): void {
    this.listState.logScrollTop = (event as CustomEvent<{ scrollTop: number }>).detail.scrollTop;
  }
  async ionViewDidEnter(): Promise<void> {
    await this.content?.scrollToPoint(undefined, this.listState.logScrollTop, 0);
  }
  async refresh(event: Event): Promise<void> {
    await this.store.sync();
    await (event.target as HTMLIonRefresherElement).complete();
  }
  async remove(fill: Fillup): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Delete this fill-up?',
      message: 'This removes the entry and recalculates your totals. This cannot be undone.',
      buttons: [
        { text: 'Keep entry', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.confirmRemove(fill.id);
          },
        },
      ],
    });
    await alert.present();
  }
  private async confirmRemove(id: string): Promise<void> {
    this.busy.set(id);
    try {
      await this.store.deleteFill(id);
      await this.geo.haptic();
    } catch (error) {
      this.store.notice.set(
        error instanceof Error ? error.message : 'Could not save the deletion.',
      );
    } finally {
      this.busy.set(null);
    }
  }
}
