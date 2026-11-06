import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { FillupFormPage } from './fillup-form.page';
import { TrackerStore } from '../../services/tracker-store';
import { GeoService } from '../../services/geo';
import { exampleFill, TestStore } from '../../testing/context.test-support';
describe('FillupFormPage', () => {
  it('rejects an invalid amount while keeping the draft', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    const fixture = TestBed.createComponent(FillupFormPage);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.amount.setValue(-1);
    await fixture.componentInstance.save();
    fixture.detectChanges();
    expect(store.saveFill).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.amount.value).toBe(-1);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
  it('marks chip changes dirty so the route guard can protect them', () => {
    const fixture = TestBed.createComponent(FillupFormPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selectAmount(150);
    expect(component.form.dirty).toBe(true);
    component.form.markAsPristine();
    component.selectGauge(3);
    expect(component.form.dirty).toBe(true);
    component.form.markAsPristine();
    component.selectStation('Uno');
    expect(component.form.dirty).toBe(true);
  });
  it('lights bars through the selected reading and clears them for E or a repeated tap', () => {
    const fixture = TestBed.createComponent(FillupFormPage);
    fixture.detectChanges();
    const buttons = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.gauge-selector button'),
      ) as HTMLButtonElement[];
    const lit = () =>
      buttons()
        .filter((button) => button.classList.contains('lit'))
        .map((button) => button.textContent?.trim());
    buttons()[6].click();
    fixture.detectChanges();
    expect(lit()).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(buttons().filter((button) => button.getAttribute('aria-pressed') === 'true')).toEqual([
      buttons()[6],
    ]);
    expect(fixture.componentInstance.form.dirty).toBe(true);
    buttons()[3].click();
    fixture.detectChanges();
    expect(lit()).toEqual(['1', '2', '3']);
    buttons()[0].click();
    fixture.detectChanges();
    expect(lit()).toEqual([]);
    expect(fixture.componentInstance.form.controls.gaugeLevel.value).toBe(0);
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('true');
    buttons()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.gaugeLevel.value).toBeNull();
    expect(buttons().every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true);
  });
  it('uses the configured bar count when displaying a saved reading', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.settings.update((settings) => ({ ...settings, gaugeSegments: 4 }));
    store.fills.set([{ ...exampleFill, gaugeLevel: 3 }]);
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', {
      value: convertToParamMap({ id: exampleFill.id }),
      configurable: true,
    });
    const fixture = TestBed.createComponent(FillupFormPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.gauge-selector button')).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.gauge-selector .lit')).toHaveLength(3);
    expect(fixture.componentInstance.form.pristine).toBe(true);
  });
  it('saves the captured coordinates and invokes the shared save service', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(FillupFormPage);
    fixture.detectChanges();
    await fixture.componentInstance.captureLocation();
    expect(fixture.componentInstance.form.dirty).toBe(true);
    await fixture.componentInstance.save();
    expect(store.saveFill).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 14.5995, longitude: 120.9842, amount: 200 }),
      false,
    );
    expect(TestBed.inject(GeoService).haptic).toHaveBeenCalledOnce();
  });
  it('recovers a directly linked entry when the initial server read finishes', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', {
      value: convertToParamMap({ id: exampleFill.id }),
      configurable: true,
    });
    const fixture = TestBed.createComponent(FillupFormPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    expect(fixture.componentInstance.missing()).toBe(true);
    store.fills.set([exampleFill]);
    fixture.detectChanges();
    expect(fixture.componentInstance.missing()).toBe(false);
    expect(fixture.componentInstance.form.controls.station.value).toBe('Uno');
  });
});
