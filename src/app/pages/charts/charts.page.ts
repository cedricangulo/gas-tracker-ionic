import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { stretchCosts } from '../../models/math';
import { TrackerStore } from '../../services/tracker-store';
import { ChartCardComponent } from '../../components/chart-card/chart-card.component';
import { SyncBannerComponent } from '../../components/sync-banner/sync-banner.component';
@Component({
  selector: 'app-charts',
  standalone: true,
  templateUrl: './charts.page.html',
  styleUrls: ['./charts.page.scss'],
  imports: [CommonModule, IonContent, ChartCardComponent, SyncBannerComponent],
})
export class ChartsPage {
  readonly store = inject(TrackerStore);
  readonly months = computed(() =>
    this.store.stats().months.map(
      (m) =>
        new Date(m.month + '-01T12:00:00').toLocaleDateString('en-PH', {
          month: 'short',
          year: '2-digit',
        }) + (m.estimated ? '*' : ''),
    ),
  );
  readonly distances = computed(() => this.store.stats().months.map((m) => m.km));
  readonly spend = computed(() => this.store.stats().months.map((m) => m.spend));
  private dateLabel(date: string): string {
    return new Date(date).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  }
  readonly fillDates = computed(() =>
    this.store.stats().rows.map((fill) => this.dateLabel(fill.dateTime)),
  );
  readonly literPrices = computed(() =>
    this.store
      .stats()
      .rows.map((fill) =>
        fill.liters !== null && fill.liters > 0 ? fill.amount / fill.liters : null,
      ),
  );
  readonly costStretches = computed(() =>
    stretchCosts(this.store.fills(), this.store.settings()).filter(
      (stretch) => stretch.cost !== null,
    ),
  );
  readonly stretchDates = computed(() =>
    this.costStretches().map((stretch) => this.dateLabel(stretch.to.dateTime)),
  );
  readonly kilometerCosts = computed(() => this.costStretches().map((stretch) => stretch.cost));
  readonly estimates = computed(() => this.store.stats().months.some((m) => m.estimated));
}
