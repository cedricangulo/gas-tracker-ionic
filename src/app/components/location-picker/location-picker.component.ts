import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import L from 'leaflet';

export interface FillupLocation {
  latitude: number;
  longitude: number;
}

const PHILIPPINES: L.LatLngTuple = [12.8797, 121.774];

@Component({
  selector: 'app-location-picker',
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
  ],
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  @Output() locationSelected = new EventEmitter<FillupLocation>();
  @Output() cancelled = new EventEmitter<void>();
  @ViewChild('mapCanvas', { static: true }) private mapCanvas!: ElementRef<HTMLDivElement>;

  readonly selected = signal<FillupLocation | null>(null);
  readonly tileError = signal(false);
  private readonly zone = inject(NgZone);
  private initialLocation: FillupLocation | null = null;
  private map?: L.Map;
  private marker?: L.Marker;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapCanvas.nativeElement, {
        zoomControl: false,
        scrollWheelZoom: false,
      }).setView(PHILIPPINES, 5);

      const zoom = L.control.zoom({ position: 'bottomright' });
      zoom.addTo(this.map);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      tiles.on('tileerror', () => this.zone.run(() => this.tileError.set(true)));
      tiles.on('tileload', () => this.zone.run(() => this.tileError.set(false)));
      tiles.addTo(this.map);

      this.map.on('click', (event: L.LeafletMouseEvent) =>
        this.zone.run(() => this.placePin(event.latlng.lat, event.latlng.lng)),
      );

      this.zone.run(() => this.showInitialLocation());
    });
  }

  private showInitialLocation(): void {
    const start = this.initialLocation;
    this.selected.set(start ? { ...start } : null);
    if (!this.map) return;
    if (start) {
      this.map.setView([start.latitude, start.longitude], 16);
      this.placePin(start.latitude, start.longitude);
    } else {
      this.marker?.remove();
      this.marker = undefined;
      this.map.setView(PHILIPPINES, 5);
    }
  }

  discardSelection(): void {
    this.showInitialLocation();
  }

  setInitialLocation(location: FillupLocation | null): void {
    this.initialLocation = location ? { ...location } : null;
    this.showInitialLocation();
  }

  placePin(latitude: number, longitude: number): void {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    )
      return;

    const point: L.LatLngTuple = [latitude, longitude];
    this.selected.set({ latitude, longitude });
    if (!this.map) return;

    if (this.marker) {
      this.marker.setLatLng(point);
      return;
    }

    this.marker = L.marker(point, {
      alt: 'Selected fill-up location',
      title: 'Selected fill-up location',
      keyboard: true,
      draggable: true,
      riseOnHover: true,
      icon: L.divIcon({
        className: 'fillup-location-marker',
        html: '<span aria-hidden="true"></span>',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      }),
    }).addTo(this.map);
    this.marker.on('dragend', () => {
      const position = this.marker?.getLatLng();
      if (position)
        this.zone.run(() => this.selected.set({ latitude: position.lat, longitude: position.lng }));
    });
  }

  invalidateSize(): void {
    this.map?.invalidateSize({ pan: false });
  }

  confirm(): void {
    const point = this.selected();
    if (point) this.locationSelected.emit(point);
  }

  cancel(): void {
    this.discardSelection();
    this.cancelled.emit();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
