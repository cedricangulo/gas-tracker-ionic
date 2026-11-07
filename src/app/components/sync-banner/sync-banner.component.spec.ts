import { TestBed } from '@angular/core/testing';
import { TrackerStore } from '../../services/tracker-store';
import { TestStore } from '../../testing/context.test-support';
import { SyncBannerComponent } from './sync-banner.component';
describe('SyncBannerComponent', () => {
  it('stays hidden when everything is synchronized', () => {
    const fixture = TestBed.createComponent(SyncBannerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
  });
  it('explains offline persistence and offers retry', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.online.set(false);
    const fixture = TestBed.createComponent(SyncBannerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('You’re offline');
    fixture.nativeElement.querySelector('button').click();
    expect(store.retry).toHaveBeenCalledOnce();
  });
});
