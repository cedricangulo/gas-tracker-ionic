import { vi } from 'vitest';
import L from 'leaflet';
import { By } from '@angular/platform-browser';
import { IonContent } from '@ionic/angular/standalone';
import { TestBed } from '@angular/core/testing';
import { MapPage } from './map.page';
import { TrackerStore } from '../../services/tracker-store';
import { exampleFill, TestStore } from '../../testing/context.test-support';

const store = () => TestBed.inject(TrackerStore) as unknown as TestStore;

describe('MapPage', () => {
  beforeEach(() => {
    vi.spyOn(MapPage.prototype, 'ngAfterViewInit').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('expands the same map and controls, preserves state, and restores on Escape or navigation', () => {
    store().fills.set(Array.from({ length: 23 }, (_, i) => ({ ...exampleFill, id: 'entry-' + i })));
    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.loadMore();
    page.heat.set(false);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const canvas = el.querySelector('.map-canvas');
    const select = el.querySelector('#map-grade');
    const dialog = el.querySelector('dialog')!;
    const show = vi.fn(() => dialog.setAttribute('open', ''));
    Object.defineProperty(dialog, 'showModal', { value: show, configurable: true });
    Object.defineProperty(dialog, 'close', {
      value: vi.fn(() => dialog.removeAttribute('open')),
      configurable: true,
    });
    const button = el.querySelector('.map-expand') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(show).toHaveBeenCalledOnce();
    expect(page.expanded()).toBe(true);
    expect(dialog.querySelector('.map-canvas')).toBe(canvas);
    expect(dialog.querySelector('#map-grade')).toBe(select);
    expect(button.getAttribute('aria-label')).toBe('Close map');
    expect(button.closest('.map-frame')).not.toBeNull();
    expect(el.querySelectorAll('.map-canvas')).toHaveLength(1);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(page.expanded()).toBe(false);
    expect(dialog.querySelector('.map-canvas')).toBeNull();
    expect(el.querySelector('.map-canvas')).toBe(canvas);
    expect(page.visibleLocated()).toHaveLength(20);
    expect(page.heat()).toBe(false);
    expect(page.grade()).toBe('unleaded');
    button.click();
    fixture.detectChanges();
    page.ionViewWillLeave();
    fixture.detectChanges();
    expect(page.expanded()).toBe(false);
    expect(el.querySelector('.map-canvas')).toBe(canvas);
  });

  it('uses the Leaflet export augmented by the heatmap plugin', () => {
    expect(typeof L.heatLayer).toBe('function');
  });

  it('shows all dates for the default grade and no date controls', () => {
    store().fills.set([
      exampleFill,
      { ...exampleFill, id: 'old', dateTime: '2026-06-01T12:00:00+08:00' },
      { ...exampleFill, id: 'no-location', latitude: null, longitude: null },
      { ...exampleFill, id: 'premium', grade: 'Premium' },
    ]);
    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.grade()).toBe('unleaded');
    expect(page.located()).toHaveLength(2);
    expect(page.stations()).toHaveLength(1);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[type="date"]')).toBeNull();
    expect(el.textContent).not.toContain('Clear dates');
    expect(el.textContent).toContain('Saved prices');
    expect(el.querySelectorAll('a[href^="/fillup/"]')).toHaveLength(2);
    page.selectGrade('premium');
    fixture.detectChanges();
    expect(page.located()).toHaveLength(1);
  });

  it('falls back when the chosen grade disappears and handles empty history', async () => {
    store().fills.set([{ ...exampleFill, grade: 'Premium' }]);
    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.grade()).toBe('premium');
    page.selectGrade('premium');
    store().fills.set([exampleFill]);
    fixture.detectChanges();
    expect(page.grade()).toBe('unleaded');
    store().fills.set([]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No saved locations');
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(true);
    expect(page.stations()).toEqual([]);
  });

  it('shows ungraded entries without a lowest-price recommendation', () => {
    store().fills.set([{ ...exampleFill, grade: null }]);
    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No fuel grade recorded');
    expect(el.textContent).not.toContain('Lowest average');
  });

  it('drives grouped markers, grade-filtered heat points, list selection and density toggling', async () => {
    vi.spyOn(MapPage.prototype, 'ngAfterViewInit').mockRestore();
    let mapSize = { x: 0, y: 0 };
    let resize: ResizeObserverCallback | undefined;
    const map = {
      setView: vi.fn().mockReturnThis(),
      fitBounds: vi.fn().mockReturnThis(),
      removeLayer: vi.fn(),
      invalidateSize: vi.fn(),
      remove: vi.fn(),
      getSize: vi.fn(() => mapSize),
    };
    const group = { addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn() };
    vi.spyOn(L, 'map').mockReturnValue(map as unknown as L.Map);
    vi.spyOn(L.control, 'zoom').mockReturnValue({ addTo: vi.fn() } as unknown as L.Control.Zoom);
    vi.spyOn(L, 'tileLayer').mockReturnValue({
      addTo: vi.fn().mockReturnThis(),
      on: vi.fn(),
    } as unknown as L.TileLayer);
    vi.spyOn(L, 'layerGroup').mockReturnValue(group as unknown as L.LayerGroup);
    const markers = vi.spyOn(L, 'circleMarker').mockImplementation(
      () =>
        ({
          bindPopup: vi.fn().mockReturnThis(),
          addTo: vi.fn().mockReturnThis(),
          openPopup: vi.fn(),
        }) as unknown as L.CircleMarker,
    );
    const heat = vi
      .spyOn(L, 'heatLayer')
      .mockImplementation(() => ({ addTo: vi.fn().mockReturnThis() }) as unknown as L.HeatLayer);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
    store().fills.set([
      exampleFill,
      { ...exampleFill, id: 'nearby', latitude: exampleFill.latitude! + 0.0002 },
      {
        ...exampleFill,
        id: 'petron',
        station: 'Petron',
        latitude: exampleFill.latitude! + 0.01,
        amount: 240,
      },
      { ...exampleFill, id: 'premium', grade: 'Premium' },
      ...Array.from({ length: 12 }, (_, i) => ({ ...exampleFill, id: 'extra-' + i })),
    ]);
    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    expect(heat).not.toHaveBeenCalled();
    const canvas = fixture.nativeElement.querySelector('.map-canvas') as HTMLElement;
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 640 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 320 });
    mapSize = { x: 640, y: 320 };
    resize?.([], {} as ResizeObserver);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.stations()).toHaveLength(2);
    expect(markers).toHaveBeenCalledTimes(group.clearLayers.mock.calls.length * 2);
    expect(heat.mock.calls.at(-1)?.[0]).toHaveLength(15);
    const unoMarker = markers.mock.results.at(-2)!.value as L.CircleMarker;
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Show Uno on map"]',
      ) as HTMLButtonElement
    ).click();
    expect(map.setView).toHaveBeenLastCalledWith([exampleFill.latitude, exampleFill.longitude], 16);
    expect(unoMarker.openPopup).toHaveBeenCalled();
    const popup = vi.mocked(unoMarker.bindPopup).mock.calls[0][0] as HTMLElement;
    expect(popup.textContent).toContain('Average: \u20b150.00/L');
    expect(fixture.componentInstance.visibleLocated()).toHaveLength(10);
    const heatCalls = heat.mock.calls.length;
    fixture.nativeElement.querySelector('.map-records .list-load-more button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.visibleLocated()).toHaveLength(15);
    expect(heat).toHaveBeenCalledTimes(heatCalls);
    const fits = map.fitBounds.mock.calls.length;
    fixture.componentInstance.heat.set(false);
    fixture.detectChanges();
    expect(map.removeLayer).toHaveBeenCalled();
    expect(map.fitBounds).toHaveBeenCalledTimes(fits);
    fixture.componentInstance.heat.set(true);
    fixture.detectChanges();
    expect(heat.mock.calls.at(-1)?.[0]).toHaveLength(15);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#map-grade');
    select.value = 'premium';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.grade()).toBe('premium');
    expect(heat.mock.calls.at(-1)?.[0]).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.station-card')).toHaveLength(1);
    store().fills.set([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.stations()).toEqual([]);
    expect(map.setView).toHaveBeenLastCalledWith([12.8797, 121.774], 5);
    fixture.destroy();
    expect(map.remove).toHaveBeenCalled();
  });
  it('limits the record list independently and resets it when the selected grade changes', () => {
    store().fills.set([
      ...Array.from({ length: 23 }, (_, i) => ({
        ...exampleFill,
        id: 'unleaded-' + i,
        dateTime: `2026-11-${String(i + 1).padStart(2, '0')}T10:00:00+08:00`,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        ...exampleFill,
        id: 'premium-' + i,
        grade: 'Premium',
      })),
    ]);
    const fixture = TestBed.createComponent(MapPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.visibleLocated()).toHaveLength(10);
    expect(page.visibleLocated()[0].id).toBe('unleaded-22');
    expect(page.located()).toHaveLength(23);
    expect(page.stations()[0].visitCount).toBe(23);
    fixture.nativeElement.querySelector('.map-records .list-load-more button').click();
    fixture.detectChanges();
    expect(page.visibleLocated()).toHaveLength(20);
    expect(page.stations()[0].visitCount).toBe(23);
    expect(fixture.nativeElement.textContent).toContain('Showing 20 of 23');
    page.selectGrade('premium');
    fixture.detectChanges();
    expect(page.visibleLocated()).toHaveLength(10);
    expect(fixture.nativeElement.textContent).toContain('Showing 10 of 12');
    page.loadMore();
    fixture.detectChanges();
    expect(page.visibleLocated()).toHaveLength(12);
    expect(fixture.nativeElement.querySelector('.map-records .list-load-more button')).toBeNull();
    page.selectGrade('unleaded');
    fixture.detectChanges();
    expect(page.visibleLocated()).toHaveLength(10);
  });
  it('retains the selected grade, loaded entries and scroll position after page recreation', async () => {
    store().fills.set(
      Array.from({ length: 23 }, (_, i) => ({
        ...exampleFill,
        id: 'entry-' + i,
        grade: 'Premium',
        createdAt: i + 1,
      })),
    );
    const original = TestBed.createComponent(MapPage);
    original.detectChanges();
    original.componentInstance.loadMore();
    original.componentInstance.rememberScroll(
      new CustomEvent('ionScroll', { detail: { scrollTop: 620 } }),
    );
    original.destroy();
    const restored = TestBed.createComponent(MapPage);
    restored.detectChanges();
    expect(restored.componentInstance.grade()).toBe('premium');
    expect(restored.componentInstance.visibleLocated()).toHaveLength(20);
    const content = restored.debugElement.query(By.directive(IonContent))
      .componentInstance as IonContent;
    const scroll = vi.spyOn(content, 'scrollToPoint').mockResolvedValue();
    await restored.componentInstance.ionViewDidEnter();
    expect(scroll).toHaveBeenCalledWith(undefined, 620, 0);
  });
});
