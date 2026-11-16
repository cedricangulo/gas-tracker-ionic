import { TestBed } from '@angular/core/testing';
import { SegmentNumberComponent } from './segment-number.component';
describe('SegmentNumberComponent', () => {
  it('announces the formatted value instead of the individual segments', () => {
    const fixture = TestBed.createComponent(SegmentNumberComponent);
    fixture.componentRef.setInput('value', 42.5);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').getAttribute('aria-label')).toBe(
      '42.5 kilometers per liter',
    );
    expect(fixture.nativeElement.querySelectorAll('polygon')).toHaveLength(28);
  });
  it('announces unavailable efficiency', () => {
    const fixture = TestBed.createComponent(SegmentNumberComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').getAttribute('aria-label')).toBe(
      'No efficiency reading yet',
    );
  });
});
