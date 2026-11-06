import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import L from 'leaflet';
import { closeOutline, expandOutline } from 'ionicons/icons';
import 'leaflet.heat';
import { TrackerStore } from '../../services/tracker-store';
import { ListViewState } from '../../services/list-view-state';
import { GeoService } from '../../services/geo';
import { StationSummary, StationComparison } from '../../models/station-summary';
import { SyncBannerComponent } from '../../components/sync-banner/sync-banner.component';
@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  imports: [CommonModule, RouterLink, FormsModule, IonContent, IonIcon, SyncBannerComponent],
})
export class MapPage implements AfterViewInit, OnDestroy {
  readonly store = inject(TrackerStore);
  private readonly geo = inject(GeoService);
  private readonly zone = inject(NgZone);
  @ViewChild('mapCanvas', { static: true }) mapCanvas!: ElementRef<HTMLDivElement>;
  private readonly listState = inject(ListViewState);
  private readonly requestedGrade = this.listState.mapGrade;
  @ViewChild(IonContent) private content?: IonContent;
  readonly allLocated = computed(() => this.store.fills().filter(StationSummary.hasLocation));
  readonly groups = computed(() => StationSummary.group(this.allLocated()));
  readonly grades = computed(() => StationSummary.grades(this.allLocated()));
  readonly grade = computed(() => {
    const requested = this.requestedGrade();
    return requested !== null && this.grades().some((g) => g.key === requested)
      ? requested
      : StationSummary.defaultGrade(this.grades());
  });
  readonly gradeLabel = computed(
    () => this.grades().find((g) => g.key === this.grade())?.label ?? 'this grade',
  );
  readonly located = computed(() =>
    this.allLocated()
      .filter((f) => StationSummary.key(f.grade) === this.grade())
      .sort(
        (a, b) =>
          Date.parse(b.dateTime) - Date.parse(a.dateTime) ||
          b.createdAt - a.createdAt ||
          b.id.localeCompare(a.id),
      ),
  );
  readonly visibleLocated = computed(() => this.located().slice(0, this.listState.mapLimit()));
  readonly stations = computed(() => StationSummary.compare(this.groups(), this.grade()));
  readonly expanded = signal(false);
  readonly expandIcon = expandOutline;
  readonly closeIcon = closeOutline;
  @ViewChild('mapSlot', { static: true }) private mapSlot!: ElementRef<HTMLElement>;
  @ViewChild('mapPanel', { static: true }) private mapPanel!: ElementRef<HTMLElement>;
  @ViewChild('expandedMap', { static: true }) private expandedMap!: ElementRef<HTMLDialogElement>;
  private expandTrigger?: HTMLElement;
  readonly heat = signal(true);
  readonly error = signal('');
  readonly locating = signal(false);
  readonly tileError = signal(false);
  private map?: L.Map;
  private markers?: L.LayerGroup;
  private heatLayer?: L.HeatLayer;
  private userMarker?: L.CircleMarker;
  private resizeObserver?: ResizeObserver;
  private readonly stationMarkers = new Map<string, L.CircleMarker>();
  private boundsKey = '';
  constructor() {
    effect(() => this.listState.selectMapGrade(this.grade()));
    effect(() => {
      this.stations();
      this.located();
      this.heat();
      if (this.map) this.draw();
    });
  }
  expandMap(event: Event): void {
    if (this.expanded()) return;
    this.expandTrigger = event.currentTarget as HTMLElement;
    const dialog = this.expandedMap.nativeElement;
    this.mapSlot.nativeElement.style.height =
      this.mapPanel.nativeElement.getBoundingClientRect().height + 'px';
    dialog.appendChild(this.mapPanel.nativeElement);
    this.expanded.set(true);
    dialog.showModal();
    this.map?.invalidateSize({ pan: false });
  }
  closeExpandedMap(): void {
    this.expandedMap.nativeElement.close();
    this.restoreMapPanel();
  }
  restoreMapPanel(): void {
    if (!this.expanded()) return;
    this.mapSlot.nativeElement.appendChild(this.mapPanel.nativeElement);
    this.mapSlot.nativeElement.style.removeProperty('height');
    this.expanded.set(false);
    this.map?.invalidateSize({ pan: false });
    this.expandTrigger?.focus({ preventScroll: true });
  }
  cancelExpandedMap(event: Event): void {
    event.preventDefault();
    this.closeExpandedMap();
  }
  ionViewWillLeave(): void {
    if (this.expanded()) this.closeExpandedMap();
  }
  selectGrade(grade: string): void {
    this.listState.selectMapGrade(grade);
  }
  loadMore(): void {
    this.listState.loadMore('map', this.located().length);
  }
  rememberScroll(event: Event): void {
    this.listState.mapScrollTop = (event as CustomEvent<{ scrollTop: number }>).detail.scrollTop;
  }
  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapCanvas.nativeElement, {
        zoomControl: false,
        scrollWheelZoom: false,
      }).setView([12.8797, 121.774], 5);
      L.control.zoom({ position: 'bottomright' }).addTo(this.map);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(this.map);
      tiles.on('tileerror', () => this.zone.run(() => this.tileError.set(true)));
      this.markers = L.layerGroup().addTo(this.map);
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(this.mapCanvas.nativeElement);
      this.draw();
    });
  }
  async ionViewDidEnter(): Promise<void> {
    this.map?.invalidateSize();
    await this.content?.scrollToPoint(undefined, this.listState.mapScrollTop, 0);
  }
  private popup(station: StationComparison): HTMLElement {
    const container = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = station.name;
    container.append(title);
    const line = (text: string) => {
      const row = document.createElement('div');
      row.textContent = text;
      container.append(row);
    };
    line(this.gradeLabel() + ' · ' + station.visitCount + ' visits');
    line(
      station.averagePrice !== null
        ? 'Average: ₱' + station.averagePrice.toFixed(2) + '/L'
        : 'Average: unavailable',
    );
    if (station.latestPrice !== null && station.latestPriceDate) {
      line(
        'Latest: ₱' +
          station.latestPrice.toFixed(2) +
          '/L · ' +
          new Date(station.latestPriceDate).toLocaleDateString('en-PH'),
      );
    } else line('Latest price: not recorded');
    line('Last visit: ' + new Date(station.lastVisit).toLocaleDateString('en-PH'));
    if (station.isLowest) line('Lowest average');
    line('Saved prices');
    return container;
  }
  private draw(): void {
    if (!this.map || !this.markers) return;
    const map = this.map;
    this.markers.clearLayers();
    this.stationMarkers.clear();
    if (this.heatLayer) {
      map.removeLayer(this.heatLayer);
      this.heatLayer = undefined;
    }
    for (const station of this.stations()) {
      const marker = L.circleMarker([station.latitude, station.longitude], {
        radius: 7,
        weight: 2,
        color: '#fff',
        fillColor: '#7a5224',
        fillOpacity: 1,
      })
        .bindPopup(this.popup(station))
        .addTo(this.markers);
      this.stationMarkers.set(station.id, marker);
    }
    const fills = this.located();
    const points: L.LatLngTuple[] = fills.map((fill) => [fill.latitude!, fill.longitude!]);
    if (points.length && this.heat())
      this.heatLayer = L.heatLayer(
        points.map((p) => [p[0], p[1], 0.7]),
        {
          radius: 28,
          blur: 22,
          minOpacity: 0.3,
        },
      ).addTo(map);
    // Toggling density or changing prices should preserve a user's chosen viewport.
    const boundsKey = JSON.stringify(fills.map((f) => [f.id, f.latitude, f.longitude]));
    if (boundsKey !== this.boundsKey) {
      if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 14 });
      else map.setView([12.8797, 121.774], 5);
      this.boundsKey = boundsKey;
    }
  }
  showStation(station: StationComparison): void {
    if (!this.map) return;
    this.map.setView([station.latitude, station.longitude], 16);
    this.stationMarkers.get(station.id)?.openPopup();
    this.mapCanvas.nativeElement.scrollIntoView?.({ block: 'center' });
    this.mapCanvas.nativeElement.focus({ preventScroll: true });
  }
  async locate(): Promise<void> {
    this.locating.set(true);
    this.error.set('');
    try {
      const p = await this.geo.current();
      if (this.map) {
        this.userMarker?.remove();
        this.userMarker = L.circleMarker([p.latitude, p.longitude], {
          color: '#245897',
          fillColor: '#5085c7',
          fillOpacity: 0.7,
          radius: 8,
        })
          .bindTooltip('Your current location')
          .addTo(this.map);
        this.map.setView([p.latitude, p.longitude], 14);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not find your location.');
    } finally {
      this.locating.set(false);
    }
  }
  ngOnDestroy(): void {
    if (this.expanded()) this.closeExpandedMap();
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }
}
