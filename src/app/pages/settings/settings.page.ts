import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon, AlertController } from '@ionic/angular/standalone';
import { TrackerStore } from '../../services/tracker-store';
import { Auth } from '../../services/auth';
import { GeoService } from '../../services/geo';
import { ApiError } from '../../services/api';
import { Appearance } from '../../models/tracker';
import { SyncBannerComponent } from '../../components/sync-banner/sync-banner.component';
@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [CommonModule, ReactiveFormsModule, IonContent, IonIcon, SyncBannerComponent],
})
export class SettingsPage {
  readonly store = inject(TrackerStore);
  readonly auth = inject(Auth);
  readonly signingOut = signal(false);
  private readonly fb = inject(FormBuilder);
  private readonly geo = inject(GeoService);
  private readonly alerts = inject(AlertController);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly stationBusy = signal(false);
  readonly stationError = signal('');
  readonly uncertainRename = signal(false);
  private renameAttempt: { from: string; to: string; operationId: string } | null = null;
  readonly themes: { value: Appearance; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'day', label: 'Day' },
    { value: 'night', label: 'Night' },
  ];
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    tankCapacity: [5.5, [Validators.required, Validators.min(0.1), Validators.max(1000)]],
    gaugeSegments: [
      6,
      [Validators.required, Validators.min(1), Validators.max(20), Validators.pattern(/^\d+$/)],
    ],
    lowFuelAnchor: [1.2, [Validators.required, Validators.min(0)]],
    factoryWMTC: [50, [Validators.required, Validators.min(0.1), Validators.max(300)]],
  });
  constructor() {
    effect(() => {
      const settings = this.store.settings();
      if (!this.form.dirty) this.form.patchValue(settings, { emitEvent: false });
    });
  }
  ionViewWillEnter(): void {
    if (!this.form.dirty) this.form.patchValue(this.store.settings());
  }
  async signOut(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    try {
      await this.auth.logout();
    } catch (error) {
      this.auth.error.set(
        error instanceof Error ? error.message : 'Could not sign out. Try again.',
      );
    } finally {
      this.signingOut.set(false);
    }
  }
  get litersPerBar(): number {
    const v = this.form.getRawValue();
    return v.gaugeSegments > 0 ? (v.tankCapacity - v.lowFuelAnchor) / v.gaugeSegments : 0;
  }
  async editStation(previous: string | null = null): Promise<void> {
    if (this.busy() || this.stationBusy()) return;
    this.stationError.set('');
    if (this.uncertainRename() && (!this.renameAttempt || previous !== this.renameAttempt.from)) {
      this.stationError.set('Retry the same rename or refresh stations first.');
      return;
    }
    if (previous !== null && !this.store.online()) {
      this.stationError.set('Connect to rename a station.');
      return;
    }
    const alert: HTMLIonAlertElement = await this.alerts.create({
      header: previous === null ? 'Add station' : 'Rename station',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value:
            previous !== null && this.uncertainRename() && this.renameAttempt?.from === previous
              ? this.renameAttempt.to
              : (previous ?? ''),
          placeholder: 'Station name',
          attributes: { maxlength: 80, autocomplete: 'off' },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: previous === null ? 'Add' : 'Rename',
          handler: async (values: { name: string }) => {
            const saved = await this.saveStationName(values.name, previous);
            if (!saved) alert.message = this.stationError();
            return saved;
          },
        },
      ],
    });
    await alert.present();
  }
  private async saveStationName(raw: string, previous: string | null): Promise<boolean> {
    if (this.busy() || this.stationBusy()) return false;
    const name = raw.trim();
    this.stationError.set('');
    if (!name) {
      this.stationError.set('Enter a station name.');
      return false;
    }
    if (new TextEncoder().encode(name).length > 80) {
      this.stationError.set('Enter a shorter station name.');
      return false;
    }
    if (previous !== null && name === previous) {
      this.stationError.set('Enter a different station name.');
      return false;
    }
    const retrying =
      previous !== null &&
      this.uncertainRename() &&
      this.renameAttempt?.from === previous &&
      this.renameAttempt.to === name;
    if (
      !retrying &&
      this.store
        .settings()
        .stations.some(
          (station) =>
            station !== previous && station.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
    ) {
      this.stationError.set('That station name already exists.');
      return false;
    }
    if (
      previous !== null &&
      this.uncertainRename() &&
      this.renameAttempt &&
      (previous !== this.renameAttempt.from || name !== this.renameAttempt.to)
    ) {
      this.stationError.set('Retry the same name or refresh stations first.');
      return false;
    }
    this.stationBusy.set(true);
    try {
      if (previous === null) await this.store.addStation(name);
      else {
        if (
          !this.renameAttempt ||
          this.renameAttempt.from !== previous ||
          this.renameAttempt.to !== name
        ) {
          this.renameAttempt = { from: previous, to: name, operationId: crypto.randomUUID() };
        }
        await this.store.renameStation(previous, name, this.renameAttempt.operationId);
        this.renameAttempt = null;
        this.uncertainRename.set(false);
      }
      return true;
    } catch (error) {
      if (
        previous !== null &&
        error instanceof ApiError &&
        (error.status === 0 || error.status >= 500)
      )
        this.uncertainRename.set(true);
      else if (previous !== null && (error instanceof ApiError || !this.uncertainRename())) {
        this.renameAttempt = null;
        this.uncertainRename.set(false);
      }
      this.stationError.set(
        error instanceof Error ? error.message : 'Could not save station. Try again.',
      );
      return false;
    } finally {
      this.stationBusy.set(false);
    }
  }
  async archiveStation(name: string): Promise<void> {
    if (this.busy() || this.stationBusy() || this.uncertainRename()) return;
    this.stationError.set('');
    const alert: HTMLIonAlertElement = await this.alerts.create({
      header: 'Archive station?',
      subHeader: name,
      message: 'Past fill-ups keep this station. It will no longer appear when adding a fill-up.',
      buttons: [
        { text: 'Keep station', role: 'cancel' },
        {
          text: 'Archive',
          role: 'destructive',
          handler: async () => {
            if (this.busy() || this.stationBusy()) return false;
            this.stationBusy.set(true);
            try {
              await this.store.archiveStation(name);
              return true;
            } catch (error) {
              this.stationError.set(
                error instanceof Error ? error.message : 'Could not archive station. Try again.',
              );
              alert.message = this.stationError();
              return false;
            } finally {
              this.stationBusy.set(false);
            }
          },
        },
      ],
    });
    await alert.present();
  }
  async refreshStations(): Promise<void> {
    if (this.busy() || this.stationBusy()) return;
    this.stationBusy.set(true);
    this.stationError.set('');
    try {
      await this.store.sync();
      if (this.store.connectionError() || !this.store.online())
        throw new Error('Could not refresh stations. Try again.');
      this.renameAttempt = null;
      this.uncertainRename.set(false);
    } catch (error) {
      this.stationError.set(
        error instanceof Error ? error.message : 'Could not refresh stations. Try again.',
      );
    } finally {
      this.stationBusy.set(false);
    }
  }
  async setTheme(value: Appearance): Promise<void> {
    try {
      await this.store.setAppearance(value);
    } catch {
      this.error.set('Could not save appearance. Try again.');
    }
  }
  async save(): Promise<void> {
    if (this.busy() || this.stationBusy()) return;
    this.error.set('');
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.name.trim()) {
      this.error.set('Check the bike name and values.');
      return;
    }
    if (v.lowFuelAnchor >= v.tankCapacity) {
      this.error.set('Fuel remaining at E must be smaller than tank capacity.');
      return;
    }
    this.busy.set(true);
    try {
      await this.store.saveSettings({ ...this.store.settings(), ...v, name: v.name.trim() });
      this.form.markAsPristine();
      await this.geo.haptic();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save settings.');
    } finally {
      this.busy.set(false);
    }
  }
}
