import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { TrackerStore } from '../../services/tracker-store';
import { GaugeComponent } from '../../components/gauge/gauge.component';
import { SegmentNumberComponent } from '../../components/segment-number/segment-number.component';
import { SyncBannerComponent } from '../../components/sync-banner/sync-banner.component';
@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    GaugeComponent,
    SegmentNumberComponent,
    SyncBannerComponent,
  ],
})
export class HomePage {
  readonly store = inject(TrackerStore);
  readonly Math = Math;
  readonly ticks = Array.from({ length: 40 }, (_, i) => (i + 1) * 2);
  async refresh(event: Event): Promise<void> {
    await this.store.sync();
    await (event.target as HTMLIonRefresherElement).complete();
  }
}
