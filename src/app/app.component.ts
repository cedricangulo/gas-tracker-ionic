import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, IonToast } from '@ionic/angular/standalone';
import { TrackerStore } from './services/tracker-store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, IonToast],
  template: `<ion-app
    ><ion-router-outlet /><ion-toast
      [isOpen]="!!store.notice()"
      [message]="store.notice()"
      position="top"
      [duration]="3600"
      (didDismiss)="store.notice.set('')"
  /></ion-app>`,
})
export class AppComponent {
  readonly store = inject(TrackerStore);
}
