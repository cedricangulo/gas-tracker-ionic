import { vi } from 'vitest';
import { AlertController } from '@ionic/angular/standalone';
import { ApiError } from '../../services/api';
import { TestBed } from '@angular/core/testing';
import { SettingsPage } from './settings.page';
import { TrackerStore } from '../../services/tracker-store';
import { TestStore } from '../../testing/context.test-support';
describe('SettingsPage', () => {
  it('shows sign out as a full-width destructive action outside the cards', () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    const action = fixture.nativeElement.querySelector('.settings-account-action');
    const button = action.querySelector('button');
    expect(action.closest('main.page')).not.toBeNull();
    expect(action.closest('.card')).toBeNull();
    expect(button.classList.contains('wide')).toBe(true);
    expect(button.classList.contains('destructive')).toBe(true);
  });

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

type StationAlertOptions = NonNullable<Parameters<AlertController['create']>[0]>;
function stationAlert() {
  let options: StationAlertOptions = {};
  const alert = {
    present: vi.fn(async () => undefined),
    message: '',
  } as unknown as HTMLIonAlertElement;
  vi.spyOn(TestBed.inject(AlertController), 'create').mockImplementation(async (value) => {
    options = value ?? {};
    return alert;
  });
  return {
    options: () => options,
    async submit(name = '') {
      const button = options.buttons?.at(-1);
      if (!button || typeof button === 'string' || !button.handler)
        throw new Error('Missing station action');
      return await button.handler({ name });
    },
  };
}

describe('Settings stations', () => {
  it('reflects station changes without replacing an unsaved bike draft', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.name.setValue('Draft bike');
    fixture.componentInstance.form.markAsDirty();
    store.settings.set({ ...store.settings(), stations: ['My station'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.station-list').textContent).toContain(
      'My station',
    );
    expect(fixture.componentInstance.form.controls.name.value).toBe('Draft bike');
  });
  it('adds a trimmed name and keeps invalid or duplicate names in the alert', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    const dialog = stationAlert();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.componentInstance.editStation();
    expect(await dialog.submit('   ')).toBe(false);
    expect(await dialog.submit('Uno')).toBe(false);
    expect(await dialog.submit('x'.repeat(81))).toBe(false);
    expect(store.addStation).not.toHaveBeenCalled();
    expect(await dialog.submit('  My station  ')).toBe(true);
    expect(store.addStation).toHaveBeenCalledWith('My station');
  });
  it('reuses the operation ID when an unconfirmed rename is retried', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.renameStation.mockRejectedValueOnce(new ApiError('Could not confirm the rename.', 0));
    const dialog = stationAlert();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.componentInstance.editStation('Uno');
    expect(await dialog.submit('Uno Fuel')).toBe(false);
    expect(fixture.componentInstance.uncertainRename()).toBe(true);
    const operationId = store.renameStation.mock.calls[0][2];
    expect(operationId).toMatch(/^[a-f0-9-]{36}$/i);
    expect(await dialog.submit('Different name')).toBe(false);
    expect(store.renameStation).toHaveBeenCalledTimes(1);
    expect(await dialog.submit('Uno Fuel')).toBe(true);
    expect(store.renameStation).toHaveBeenLastCalledWith('Uno', 'Uno Fuel', operationId);
    expect(fixture.componentInstance.uncertainRename()).toBe(false);
  });
  it('refreshes stations before allowing a new rename after an uncertain response', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.renameStation.mockRejectedValueOnce(new ApiError('Could not confirm the rename.', 0));
    const dialog = stationAlert();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.componentInstance.editStation('Uno');
    expect(await dialog.submit('Uno Fuel')).toBe(false);
    store.connectionError.set('Cannot connect.');
    await fixture.componentInstance.refreshStations();
    expect(fixture.componentInstance.uncertainRename()).toBe(true);
    store.connectionError.set('');
    await fixture.componentInstance.refreshStations();
    expect(store.sync).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.uncertainRename()).toBe(false);
  });
  it('allows correcting a known rename validation error', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.renameStation.mockRejectedValueOnce(
      new ApiError('That station name already exists.', 422),
    );
    const dialog = stationAlert();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.componentInstance.editStation('Uno');
    expect(await dialog.submit('First choice')).toBe(false);
    const oldOperation = store.renameStation.mock.calls[0][2];
    expect(await dialog.submit('New choice')).toBe(true);
    expect(store.renameStation.mock.calls[1][2]).not.toBe(oldOperation);
  });
  it('confirms archiving and explains that past fill-ups are retained', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    const dialog = stationAlert();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.componentInstance.archiveStation('Uno');
    expect(dialog.options().message).toContain('Past fill-ups keep this station');
    expect(store.archiveStation).not.toHaveBeenCalled();
    expect(await dialog.submit()).toBe(true);
    expect(store.archiveStation).toHaveBeenCalledWith('Uno');
  });
  it('disables rename offline while add and archive remain available', () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    store.online.set(false);
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Rename Uno"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[aria-label="Archive Uno"]').disabled).toBe(false);
  });
  it('disables station actions while an add is being saved', async () => {
    const store = TestBed.inject(TrackerStore) as unknown as TestStore;
    let finish!: () => void;
    store.addStation.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const dialog = stationAlert();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.componentInstance.editStation();
    const saving = dialog.submit('New station');
    fixture.detectChanges();
    expect(fixture.componentInstance.stationBusy()).toBe(true);
    const actions: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.stations button'),
    );
    expect(actions.every((button) => button.disabled)).toBe(true);
    finish();
    await saving;
    expect(fixture.componentInstance.stationBusy()).toBe(false);
  });
});
