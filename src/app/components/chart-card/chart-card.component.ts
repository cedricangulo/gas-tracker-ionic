import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  computed,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Chart, ChartConfiguration } from 'chart.js/auto';
@Component({
  selector: 'app-chart-card',
  standalone: true,
  templateUrl: './chart-card.component.html',
  styleUrls: ['./chart-card.component.scss'],
  imports: [DecimalPipe],
})
export class ChartCardComponent implements AfterViewInit, OnDestroy {
  readonly title = input('');
  readonly subtitle = input('');
  readonly kind = input<'bar' | 'line'>('bar');
  readonly labels = input<string[]>([]);
  readonly values = input<(number | null)[]>([]);
  readonly unit = input('');
  readonly benchmark = input<number | null>(null);
  readonly hasData = computed(() => this.values().some((v) => v !== null));
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart<'bar' | 'line', (number | null)[], string>;
  private observer?: MutationObserver;
  private readonly zone = inject(NgZone);
  constructor() {
    effect(() => {
      this.labels();
      this.values();
      this.kind();
      this.benchmark();
      if (this.canvas) this.render();
    });
  }
  ngAfterViewInit(): void {
    this.render();
    this.observer = new MutationObserver(() => this.render());
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
  private render(): void {
    this.zone.runOutsideAngular(() => {
      this.chart?.destroy();
      const css = getComputedStyle(document.documentElement);
      const accent = css.getPropertyValue('--accent').trim();
      const muted = css.getPropertyValue('--muted').trim();
      const line = css.getPropertyValue('--line').trim();
      const config: ChartConfiguration<'bar' | 'line', (number | null)[], string> = {
        type: this.kind(),
        data: {
          labels: this.labels(),
          datasets: [
            {
              label: this.title(),
              data: this.values(),
              backgroundColor: this.kind() === 'bar' ? accent : accent + '16',
              borderColor: accent,
              borderWidth: this.kind() === 'line' ? 2 : 0,
              borderRadius: 4,
              maxBarThickness: 38,
              pointRadius: 3,
              pointHoverRadius: 5,
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: matchMedia('(prefers-reduced-motion: reduce)').matches
            ? false
            : { duration: 350 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: this.benchmark() !== null,
              labels: {
                color: muted,
                boxWidth: 12,
                usePointStyle: true,
                font: { family: 'Barlow', size: 11 },
              },
            },
            tooltip: {
              callbacks: {
                label: (context) =>
                  context.dataset.label +
                  ': ' +
                  (context.parsed.y?.toFixed(1) ?? '—') +
                  ' ' +
                  this.unit(),
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: muted,
                maxTicksLimit: 6,
                maxRotation: 0,
                font: { family: 'Barlow', size: 11 },
              },
            },
            y: {
              beginAtZero: true,
              border: { display: false },
              ticks: {
                color: muted,
                maxTicksLimit: 5,
                font: { family: 'Geist Mono Variable', size: 10 },
              },
              grid: { color: line + '55' },
            },
          },
        },
      };
      if (this.benchmark() !== null)
        config.data.datasets.push({
          type: 'line',
          label: 'WMTC',
          data: this.labels().map(() => this.benchmark()),
          borderColor: muted,
          backgroundColor: muted,
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
        });
      this.chart = new Chart(this.canvas.nativeElement, config);
    });
  }
  ngOnDestroy(): void {
    this.chart?.destroy();
    this.observer?.disconnect();
  }
}
