import { Component, input, computed } from '@angular/core';
@Component({
  selector: 'app-gauge',
  standalone: true,
  templateUrl: './gauge.component.html',
  styleUrls: ['./gauge.component.scss'],
})
export class GaugeComponent {
  readonly level = input<number | null>(null);
  readonly max = input(6);
  readonly vertical = input(false);
  readonly bars = computed(() => Array.from({ length: this.max() }, (_, i) => i));
}
