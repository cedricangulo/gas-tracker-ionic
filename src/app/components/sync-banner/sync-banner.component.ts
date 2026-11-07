import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TrackerStore } from '../../services/tracker-store';
@Component({
  selector: 'app-sync-banner',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './sync-banner.component.html',
  styleUrls: ['./sync-banner.component.scss'],
})
export class SyncBannerComponent {
  readonly store = inject(TrackerStore);
}
