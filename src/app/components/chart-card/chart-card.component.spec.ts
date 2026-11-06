import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChartCardComponent } from './chart-card.component';
describe('ChartCardComponent', () => {
  beforeEach(() => {
    vi.spyOn(
      ChartCardComponent.prototype as unknown as { render(): void },
      'render',
    ).mockImplementation(() => undefined);
  });
  it('provides exact values as accessible table data', () => {
    const fixture = TestBed.createComponent(ChartCardComponent);
    fixture.componentRef.setInput('title', 'Monthly spend');
    fixture.componentRef.setInput('unit', '\u20b1');
    fixture.componentRef.setInput('labels', ['Nov 26']);
    fixture.componentRef.setInput('values', [200]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('canvas').getAttribute('aria-label')).toContain(
      'Monthly spend',
    );
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('200');
  });
  it('explains an empty chart without claiming a zero measurement', () => {
    const fixture = TestBed.createComponent(ChartCardComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No chart data yet');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });
});
