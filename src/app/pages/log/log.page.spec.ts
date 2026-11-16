import { vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { IonContent } from '@ionic/angular/standalone';
import { TestBed } from '@angular/core/testing';
import { LogPage } from './log.page';
import { TrackerStore } from '../../services/tracker-store';
import { exampleFill, TestStore } from '../../testing/context.test-support';
describe('LogPage', () => {
  it('shows the empty log prompt', () => {
    const fixture = TestBed.createComponent(LogPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No fill-ups yet');
  });
  it('renders entries newest first with an edit action', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.fills.set([
      exampleFill,
      {
        ...exampleFill,
        id: 'second',
        station: 'Shell',
        odometer: 1200,
        dateTime: '2026-11-07T10:00:00+08:00',
      },
    ]);
    const fixture = TestBed.createComponent(LogPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.rows()[0].fill.station).toBe('Shell');
    expect(fixture.nativeElement.querySelectorAll('.fill-card')).toHaveLength(2);
    expect(
      fixture.nativeElement.querySelector('a[aria-label^="Edit fill-up"]').getAttribute('href'),
    ).toBe('/fillup/second');
  });
  it('appends ten at a time while computing distances from the complete history', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.fills.set(
      Array.from({ length: 23 }, (_, i) => ({
        ...exampleFill,
        id: 'entry-' + i,
        dateTime: `2026-11-${String(i + 1).padStart(2, '0')}T10:00:00+08:00`,
        odometer: 1000 + i * 100,
      })),
    );
    const fixture = TestBed.createComponent(LogPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(fixture.nativeElement.querySelectorAll('.fill-card')).toHaveLength(10);
    expect(page.visibleRows()[0].fill.id).toBe('entry-22');
    expect(page.visibleRows()[9].distance).toBe(100);
    expect(fixture.nativeElement.textContent).toContain('Showing 10 of 23');
    fixture.nativeElement.querySelector('.list-load-more button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.fill-card')).toHaveLength(20);
    fixture.nativeElement.querySelector('.list-load-more button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.fill-card')).toHaveLength(23);
    expect(fixture.nativeElement.textContent).toContain('Showing 23 of 23');
    expect(fixture.nativeElement.querySelector('.list-load-more button')).toBeNull();
    store.fills.set(store.fills().slice(0, 5));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Showing 5 of 5');
  });
  it('retains loaded entries and restores the scroll position after page recreation', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.fills.set(
      Array.from({ length: 23 }, (_, i) => ({
        ...exampleFill,
        id: 'entry-' + i,
        createdAt: i + 1,
      })),
    );
    const original = TestBed.createComponent(LogPage);
    original.detectChanges();
    original.componentInstance.loadMore();
    original.componentInstance.rememberScroll(
      new CustomEvent('ionScroll', { detail: { scrollTop: 480 } }),
    );
    original.destroy();
    const restored = TestBed.createComponent(LogPage);
    restored.detectChanges();
    expect(restored.componentInstance.visibleRows()).toHaveLength(20);
    const content = restored.debugElement.query(By.directive(IonContent))
      .componentInstance as IonContent;
    const scroll = vi.spyOn(content, 'scrollToPoint').mockResolvedValue();
    await restored.componentInstance.ionViewDidEnter();
    expect(scroll).toHaveBeenCalledWith(undefined, 480, 0);
  });
});
