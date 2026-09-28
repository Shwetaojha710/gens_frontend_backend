import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LOCATION_FEATURES, LOCATION_MARKERS } from '../../../data/site-data';
import { LocationFeature } from '../../../data/site.models';

/** Interactive feature-selector paired with the location-tracking dashboard image. */
@Component({
  selector: 'app-location-tracking-showcase',
  imports: [CommonModule],
  templateUrl: './location-tracking-showcase.component.html',
  styleUrl: './location-tracking-showcase.component.css',
})
export class LocationTrackingShowcaseComponent {
  readonly features: LocationFeature[] = LOCATION_FEATURES;
  readonly markers = LOCATION_MARKERS;
  readonly active = signal(0);

  activeFeature(): LocationFeature {
    return this.features[this.active()];
  }

  selectFeature(index: number): void {
    this.active.set(index);
  }

  markerColorClass(code: string): string {
    switch (code) {
      case 'S':
        return 'bg-emerald-500';
      case 'E':
        return 'bg-rose-500';
      case 'ST':
        return 'bg-violet-500';
      case 'P':
        return 'bg-orange-500';
      default:
        return 'bg-gens-600';
    }
  }
}
