import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { TrackerStore } from '../../services/tracker-store';
import { GeoService } from '../../services/geo';
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
  private readonly fb = inject(FormBuilder);
  private readonly geo = inject(GeoService);
  readonly error = signal('');
  readonly busy = signal(false);
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
  get litersPerBar(): number {
    const v = this.form.getRawValue();
    return v.gaugeSegments > 0 ? (v.tankCapacity - v.lowFuelAnchor) / v.gaugeSegments : 0;
  }
  async setTheme(value: Appearance): Promise<void> {
    try {
      await this.store.setAppearance(value);
    } catch {
      this.error.set('Could not save appearance. Check available device storage.');
    }
  }
  async save(): Promise<void> {
    this.error.set('');
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.name.trim()) {
      this.error.set('Check the bike name and numeric values below.');
      return;
    }
    if (v.lowFuelAnchor >= v.tankCapacity) {
      this.error.set('Low-fuel anchor must be smaller than tank capacity.');
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
