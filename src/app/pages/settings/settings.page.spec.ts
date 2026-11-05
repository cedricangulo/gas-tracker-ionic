import { TestBed } from '@angular/core/testing';
import { SettingsPage } from './settings.page';
import { TrackerStore } from '../../services/tracker-store';
import { TestStore } from '../../testing/context.test-support';
describe('SettingsPage', () => {
  it('updates a pristine form when the initial server settings arrive', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    store.settings.set({ ...store.settings(), name: 'My saved motorcycle' });
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.name.value).toBe('My saved motorcycle');
  });
  it('preserves a draft when settings refresh while editing', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.name.setValue('Unsaved name');
    fixture.componentInstance.form.markAsDirty();
    store.settings.set({ ...store.settings(), name: 'Server name' });
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.name.value).toBe('Unsaved name');
  });
  it('rejects an anchor larger than the tank', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.lowFuelAnchor.setValue(8);
    await fixture.componentInstance.save();
    fixture.detectChanges();
    expect(store.saveSettings).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('smaller than tank capacity');
  });
});
