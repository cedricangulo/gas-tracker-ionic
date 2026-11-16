import { TestBed } from '@angular/core/testing';
import { GaugeComponent } from './gauge.component';
describe('GaugeComponent', () => {
  it('renders the configured bars and an accessible reading', () => {
    const fixture = TestBed.createComponent(GaugeComponent);
    fixture.componentRef.setInput('level', 3);
    fixture.componentRef.setInput('max', 6);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.pip')).toHaveLength(6);
    expect(el.querySelectorAll('.pip.on')).toHaveLength(3);
    expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('3 of 6 fuel bars');
  });
  it('distinguishes a missing reading from E', () => {
    const fixture = TestBed.createComponent(GaugeComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('E');
    expect(fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toBe(
      'Gauge not recorded',
    );
    fixture.componentRef.setInput('level', 0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toBe(
      '0 of 6 fuel bars',
    );
  });
});
