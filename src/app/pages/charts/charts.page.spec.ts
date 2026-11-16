import { vi } from 'vitest';
import { ChartCardComponent } from '../../components/chart-card/chart-card.component';
import { TestBed } from '@angular/core/testing';
import { ChartsPage } from './charts.page';
import { TrackerStore } from '../../services/tracker-store';
import { exampleFill, TestStore } from '../../testing/context.test-support';
describe('ChartsPage', () => {
  beforeEach(() => {
    vi.spyOn(
      ChartCardComponent.prototype as unknown as { render(): void },
      'render',
    ).mockImplementation(() => undefined);
  });
  it('renders distance, fuel price, cost per kilometer and spending charts', () => {
    const fixture = TestBed.createComponent(ChartsPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-chart-card')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Distance per month');
    expect(fixture.nativeElement.textContent).not.toContain('Gauge estimate');
    expect(fixture.nativeElement.textContent).toContain('Price per liter');
    expect(fixture.nativeElement.textContent).toContain('Cost per kilometer');
    expect(fixture.nativeElement.textContent).toContain(
      'Estimated from gauge readings and fuel prices.',
    );
    expect(fixture.nativeElement.textContent).toContain('Monthly spend');
  });
  it('uses shared monthly spending data', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.fills.set([exampleFill]);
    const fixture = TestBed.createComponent(ChartsPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.spend()).toEqual([200]);
  });
  it('plots reference gauge-stretch costs independently of full-tank costs', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.fills.set([
      exampleFill,
      {
        ...exampleFill,
        id: 'partial',
        filledToFull: false,
        liters: 2,
        amount: 120,
        odometer: 1100,
        dateTime: '2026-11-07T10:00:00+08:00',
      },
      {
        ...exampleFill,
        id: 'closing',
        liters: 3,
        amount: 240,
        odometer: 1200,
        dateTime: '2026-11-08T10:00:00+08:00',
      },
    ]);
    const fixture = TestBed.createComponent(ChartsPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.literPrices()).toEqual([50, 60, 80]);
    expect(page.kilometerCosts()).toEqual([1.2, 2.4]);
    expect(store.stats().costPerKm).toBe(2);
    expect(page.fillDates()).toHaveLength(3);
    expect(page.stretchDates()).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('app-chart-card details')).toHaveLength(4);
  });
  it('keeps unavailable prices as gaps rather than zero', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.fills.set([
      exampleFill,
      {
        ...exampleFill,
        id: 'unknown',
        filledToFull: false,
        liters: null,
        odometer: 1100,
        dateTime: '2026-11-07T10:00:00+08:00',
      },
      { ...exampleFill, id: 'closing', odometer: 1200, dateTime: '2026-11-08T10:00:00+08:00' },
    ]);
    const fixture = TestBed.createComponent(ChartsPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.literPrices()).toEqual([50, null, 50]);
    expect(page.kilometerCosts()).toEqual([2]);
    store.fills.set([]);
    fixture.detectChanges();
    expect(page.literPrices()).toEqual([]);
    expect(page.kilometerCosts()).toEqual([]);
  });
});
