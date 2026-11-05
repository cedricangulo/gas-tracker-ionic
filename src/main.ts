import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { provideAppInitializer, inject, importProvidersFrom, isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { IonicStorageModule } from '@ionic/storage-angular';
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
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { TrackerStore } from './app/services/tracker-store';

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

bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular({ mode: 'md' }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(
      IonicStorageModule.forRoot({ name: 'gas-tracker', driverOrder: ['asyncStorage'] }),
    ),
    provideAppInitializer(() => inject(TrackerStore).init()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:3000',
    }),
  ],
}).catch((error) => {
  console.error(error);
  document.body.innerHTML =
    '<main style="padding:32px;font-family:sans-serif"><h1>Unable to open Gas Tracker</h1><p>Local storage is unavailable. Allow site storage, then reload.</p></main>';
});
