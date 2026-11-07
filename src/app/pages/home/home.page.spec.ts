import { TestBed } from '@angular/core/testing';
import { HomePage } from './home.page';
import { TrackerStore } from '../../services/tracker-store';
import { exampleFill, TestStore } from '../../testing/context.test-support';
describe('HomePage', () => {
  it('offers a first fill-up when the log is empty', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No fill-ups yet');
  });
  it('updates the latest fill when the shared log changes', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    store.fills.set([exampleFill]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Uno');
    expect(fixture.nativeElement.textContent).toContain('Last fill-up');
    expect(fixture.nativeElement.textContent).not.toContain('No fill-ups yet');
  });
});
