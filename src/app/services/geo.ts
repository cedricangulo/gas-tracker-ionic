import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, NotificationType } from '@capacitor/haptics';

@Injectable({ providedIn: 'root' })
export class GeoService {
  async current(): Promise<{ latitude: number; longitude: number }> {
    try {
      // requestPermissions is native-only; the web implementation prompts from getCurrentPosition.
      if (Capacitor.isNativePlatform())
        await Geolocation.requestPermissions({ permissions: ['location'] });
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/denied|permission/i.test(message))
        throw new Error(
          'Location permission was denied. Allow it in your browser or device settings and try again.',
        );
      if (/timeout|timed out/i.test(message))
        throw new Error('Finding your location took too long. Try again outdoors.');
      throw new Error(
        'Location is unavailable. Use HTTPS or localhost, enable location services, and try again.',
      );
    }
  }
  async haptic(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {
        /* Optional feedback must not interrupt saving. */
      }
    }
  }
}
