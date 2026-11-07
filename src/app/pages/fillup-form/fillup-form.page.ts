import { Component, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonModal, AlertController } from '@ionic/angular/standalone';
import { TrackerStore } from '../../services/tracker-store';
import { GeoService } from '../../services/geo';
import { Fillup } from '../../models/tracker';
import { isoWithOffset, localDateTime } from '../../models/math';
import { SyncBannerComponent } from '../../components/sync-banner/sync-banner.component';
import {
  FillupLocation,
  LocationPickerComponent,
} from '../../components/location-picker/location-picker.component';
@Component({
  selector: 'app-fillup-form',
  standalone: true,
  templateUrl: './fillup-form.page.html',
  styleUrls: ['./fillup-form.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonModal,
    SyncBannerComponent,
    LocationPickerComponent,
  ],
})
export class FillupFormPage {
  readonly store = inject(TrackerStore);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly geo = inject(GeoService);
  private readonly alerts = inject(AlertController);
  readonly error = signal('');
  readonly locationError = signal('');
  readonly busy = signal(false);
  readonly locating = signal(false);
  readonly location = signal<{ latitude: number; longitude: number } | null>(null);
  readonly locationPickerOpen = signal(false);
  @ViewChild(LocationPickerComponent) private locationPicker?: LocationPickerComponent;
  readonly editing = signal(false);
  readonly missing = signal(false);
  private readonly activeId = signal('new');
  private original: Fillup | null = null;
  readonly quickAmounts = [100, 150, 200, 250];
  readonly form = this.fb.group({
    amount: this.fb.nonNullable.control(200, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(99999999),
    ]),
    liters: this.fb.control<number | null>(null, [Validators.min(0.001), Validators.max(99999)]),
    gaugeLevel: this.fb.control<number | null>(null),
    filledToFull: this.fb.nonNullable.control(false),
    dateTime: this.fb.nonNullable.control(localDateTime(), Validators.required),
    odometer: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(999999999)]),
    station: this.fb.control<string | null>(null),
    grade: this.fb.control<string | null>(null),
  });
  readonly currentStation = signal<string | null>(null);
  readonly currentGrade = signal<string | null>(null);
  readonly stations = computed(() => [
    ...new Set([
      ...this.store.settings().stations,
      ...(this.currentStation() ? [this.currentStation()!] : []),
    ]),
  ]);
  readonly grades = computed(() => [
    ...new Set([
      ...this.store.settings().grades,
      ...(this.currentGrade() ? [this.currentGrade()!] : []),
    ]),
  ]);
  get bars(): number[] {
    return Array.from({ length: this.store.settings().gaugeSegments + 1 }, (_, i) => i);
  }
  get pricePerLiter(): number | null {
    const { amount, liters } = this.form.getRawValue();
    return liters && amount > 0 ? amount / liters : null;
  }
  constructor() {
    effect(() => {
      const id = this.activeId();
      const rows = this.store.fills();
      if (id === 'new' || this.form.dirty) return;
      const fill = rows.find((f) => f.id === id);
      this.missing.set(!fill);
      if (fill && fill !== this.original) {
        this.original = fill;
        this.form.reset({ ...fill, dateTime: localDateTime(new Date(fill.dateTime)) });
        this.location.set(
          fill.latitude !== null && fill.longitude !== null
            ? { latitude: fill.latitude, longitude: fill.longitude }
            : null,
        );
        this.currentStation.set(fill.station);
        this.currentGrade.set(fill.grade);
      }
    });
  }
  selectAmount(value: number): void {
    this.form.controls.amount.setValue(value);
    this.form.markAsDirty();
  }
  selectGauge(value: number): void {
    const c = this.form.controls.gaugeLevel;
    c.setValue(c.value === value ? null : value);
    this.form.markAsDirty();
  }
  selectStation(value: string): void {
    const c = this.form.controls.station;
    c.setValue(c.value === value ? null : value);
    this.form.markAsDirty();
  }
  selectGrade(value: string): void {
    const c = this.form.controls.grade;
    c.setValue(c.value === value ? null : value);
    this.form.markAsDirty();
  }
  removeLocation(): void {
    this.location.set(null);
    this.form.markAsDirty();
  }
  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.activeId.set(id ?? 'new');
    this.editing.set(id !== 'new');
    this.original = this.store.fills().find((f) => f.id === id) ?? null;
    this.missing.set(this.editing() && !this.original);
    this.error.set('');
    this.locationError.set('');
    const f = this.original;
    this.form.reset(
      f
        ? { ...f, dateTime: localDateTime(new Date(f.dateTime)) }
        : {
            amount: 200,
            liters: null,
            gaugeLevel: null,
            filledToFull: false,
            dateTime: localDateTime(),
            odometer: null,
            station: null,
            grade: null,
          },
    );
    this.location.set(
      f?.latitude !== null && f?.latitude !== undefined && f.longitude !== null
        ? { latitude: f.latitude, longitude: f.longitude }
        : null,
    );
    this.currentStation.set(f?.station ?? null);
    this.currentGrade.set(f?.grade ?? null);
  }
  invalid(name: 'amount' | 'liters' | 'odometer' | 'dateTime'): boolean {
    return this.form.controls[name].invalid && this.form.controls[name].touched;
  }
  async captureLocation(): Promise<void> {
    this.locating.set(true);
    this.locationError.set('');
    try {
      this.location.set(await this.geo.current());
      this.form.markAsDirty();
    } catch (error) {
      this.locationError.set(error instanceof Error ? error.message : 'Location is unavailable.');
    } finally {
      this.locating.set(false);
    }
  }
  openLocationPicker(): void {
    this.locationError.set('');
    this.locationPickerOpen.set(true);
  }
  selectManualLocation(point: FillupLocation): void {
    this.location.set(point);
    this.locationError.set('');
    this.form.markAsDirty();
    this.locationPickerOpen.set(false);
  }
  closeLocationPicker(): void {
    this.locationPickerOpen.set(false);
  }
  onLocationPickerDismissed(): void {
    this.closeLocationPicker();
  }
  onLocationPickerPresented(): void {
    const picker = this.locationPicker;
    if (!picker) return;
    picker.invalidateSize();
    picker.setInitialLocation(this.location());
  }
  async addChoice(kind: 'stations' | 'grades'): Promise<void> {
    const alert = await this.alerts.create({
      header: kind === 'stations' ? 'Add a station' : 'Add a fuel grade',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: kind === 'stations' ? 'Station name' : 'Fuel grade',
          attributes: { maxlength: 80, autocomplete: 'off' },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (values: { name: string }) => {
            void this.saveChoice(kind, values.name);
          },
        },
      ],
    });
    await alert.present();
  }
  private async saveChoice(kind: 'stations' | 'grades', name: string): Promise<void> {
    const cleaned = name.trim();
    if (!cleaned || new TextEncoder().encode(cleaned).length > 80) {
      this.error.set('Enter a shorter name.');
      return;
    }
    const settings = this.store.settings();
    const match = settings[kind].find((v) => v.toLowerCase() === cleaned.toLowerCase());
    try {
      if (!match)
        await this.store.saveSettings({ ...settings, [kind]: [...settings[kind], cleaned] });
      if (kind === 'stations') {
        this.form.controls.station.setValue(match ?? cleaned);
        this.currentStation.set(match ?? cleaned);
      } else {
        this.form.controls.grade.setValue(match ?? cleaned);
        this.currentGrade.set(match ?? cleaned);
      }
      this.form.markAsDirty();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save that choice.');
    }
  }
  async save(): Promise<void> {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Check the highlighted fields.');
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    try {
      const fill: Fillup = {
        ...v,
        id: this.original?.id ?? crypto.randomUUID(),
        dateTime: isoWithOffset(v.dateTime),
        createdAt: this.original?.createdAt ?? Date.now(),
        latitude: this.location()?.latitude ?? null,
        longitude: this.location()?.longitude ?? null,
      };
      await this.store.saveFill(fill, this.editing());
      this.form.markAsPristine();
      await this.geo.haptic();
      await this.router.navigateByUrl('/log', { replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save. Try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
