import { Component, input, computed } from '@angular/core';
const digitSegments: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
};
@Component({
  selector: 'app-segment-number',
  standalone: true,
  templateUrl: './segment-number.component.html',
  styleUrls: ['./segment-number.component.scss'],
})
export class SegmentNumberComponent {
  readonly value = input<number | null>(null);
  readonly cells = computed(() =>
    (this.value() === null ? '----' : this.value()!.toFixed(1).replace('.', '').padStart(4, ' '))
      .slice(-4)
      .split(''),
  );
  readonly segments = [
    { key: 'a', points: '8,2 43,2 48,7 43,12 8,12 3,7' },
    { key: 'b', points: '45,14 50,9 55,14 55,42 50,47 45,42' },
    { key: 'c', points: '45,57 50,52 55,57 55,85 50,90 45,85' },
    { key: 'd', points: '8,88 43,88 48,93 43,98 8,98 3,93' },
    { key: 'e', points: '0,57 5,52 10,57 10,85 5,90 0,85' },
    { key: 'f', points: '0,14 5,9 10,14 10,42 5,47 0,42' },
    { key: 'g', points: '8,45 43,45 48,50 43,55 8,55 3,50' },
  ];
  lit(char: string, key: string): boolean {
    return (digitSegments[char] ?? '').includes(key);
  }
}
