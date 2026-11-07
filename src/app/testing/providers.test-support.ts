import { addIcons } from 'ionicons';
import {
  homeOutline,
  barChartOutline,
  receiptOutline,
  settingsOutline,
  addOutline,
  arrowBackOutline,
  locationOutline,
  mapOutline,
  closeOutline,
  trashOutline,
  createOutline,
  arrowForwardOutline,
  checkmarkOutline,
  refreshOutline,
  cloudOfflineOutline,
  chevronForwardOutline,
  informationCircleOutline,
  navigateOutline,
  cashOutline,
  speedometerOutline,
  waterOutline,
} from 'ionicons/icons';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { TrackerStore } from '../services/tracker-store';
import { Auth } from '../services/auth';
import { GeoService } from '../services/geo';
import { createTestStore } from './context.test-support';
addIcons({
  homeOutline,
  barChartOutline,
  receiptOutline,
  settingsOutline,
  addOutline,
  arrowBackOutline,
  locationOutline,
  mapOutline,
  closeOutline,
  trashOutline,
  createOutline,
  arrowForwardOutline,
  checkmarkOutline,
  refreshOutline,
  cloudOfflineOutline,
  chevronForwardOutline,
  informationCircleOutline,
  navigateOutline,
  cashOutline,
  speedometerOutline,
  waterOutline,
});
export default [
  provideRouter([]),
  provideIonicAngular({ animated: false }),
  { provide: TrackerStore, useFactory: createTestStore },
  {
    provide: Auth,
    useFactory: () => ({
      authenticated: signal(false),
      checking: signal(false),
      error: signal(''),
      login: vi.fn(async () => undefined),
      logout: vi.fn(async () => undefined),
    }),
  },
  {
    provide: GeoService,
    useFactory: () => ({
      current: vi.fn(async () => ({ latitude: 14.5995, longitude: 120.9842 })),
      haptic: vi.fn(async () => undefined),
    }),
  },
];
