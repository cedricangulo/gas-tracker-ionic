import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationPickerComponent } from './location-picker.component';

describe('LocationPickerComponent', () => {
  beforeEach(() => {
    vi.spyOn(LocationPickerComponent.prototype, 'ngAfterViewInit').mockImplementation(() => {});
    TestBed.configureTestingModule({ imports: [LocationPickerComponent] });
  });

  afterEach(() => vi.restoreAllMocks());

  it('restores a saved location when the modal is presented', () => {
    const fixture = TestBed.createComponent(LocationPickerComponent);
    fixture.detectChanges();

    fixture.componentInstance.setInitialLocation({ latitude: 14.5995, longitude: 120.9842 });

    expect(fixture.componentInstance.selected()).toEqual({
      latitude: 14.5995,
      longitude: 120.9842,
    });
  });

  it('lets the user move a pin and confirms the chosen coordinates', () => {
    const fixture = TestBed.createComponent(LocationPickerComponent);
    const selected = vi.fn();
    fixture.componentInstance.locationSelected.subscribe(selected);
    fixture.detectChanges();

    fixture.componentInstance.placePin(14.5995, 120.9842);
    fixture.detectChanges();
    fixture.componentInstance.confirm();

    expect(fixture.componentInstance.selected()).toEqual({
      latitude: 14.5995,
      longitude: 120.9842,
    });
    expect(fixture.nativeElement.textContent).toContain('Use this spot');
    expect(selected).toHaveBeenCalledWith({ latitude: 14.5995, longitude: 120.9842 });
  });

  it('does not confirm until a valid map point has been selected', () => {
    const fixture = TestBed.createComponent(LocationPickerComponent);
    const selected = vi.fn();
    fixture.componentInstance.locationSelected.subscribe(selected);
    fixture.detectChanges();

    fixture.componentInstance.placePin(100, 200);
    fixture.componentInstance.confirm();
    fixture.detectChanges();

    expect(fixture.componentInstance.selected()).toBeNull();
    expect(selected).not.toHaveBeenCalled();
    expect(
      (fixture.nativeElement.querySelector('button.button') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('cancels without confirming a selected point', () => {
    const fixture = TestBed.createComponent(LocationPickerComponent);
    const selected = vi.fn();
    const cancelled = vi.fn();
    fixture.componentInstance.locationSelected.subscribe(selected);
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.detectChanges();

    fixture.componentInstance.placePin(14.5, 121);
    fixture.componentInstance.cancel();

    expect(cancelled).toHaveBeenCalledOnce();
    expect(selected).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selected()).toBeNull();
  });

  it('shows a helpful message when map tiles cannot load', () => {
    const fixture = TestBed.createComponent(LocationPickerComponent);
    fixture.detectChanges();

    fixture.componentInstance.tileError.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Check your internet connection');
  });
});
