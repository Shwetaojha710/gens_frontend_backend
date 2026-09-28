import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PRODUCT_SCREENSHOTS } from '../../../data/site-data';
import { ProductScreenshot } from '../../../data/site.models';

/** Thumbnail-nav + preview panel gallery for the product screenshots grid. */
@Component({
  selector: 'app-product-gallery',
  imports: [CommonModule],
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.css',
})
export class ProductGalleryComponent {
  readonly screenshots: ProductScreenshot[] = PRODUCT_SCREENSHOTS;
  readonly active = signal<string>('dashboard');

  private readonly icons: Record<string, string> = {
    dashboard: 'ri-dashboard-3-line',
    profile: 'ri-user-3-line',
    attendance: 'ri-time-line',
    payroll: 'ri-money-dollar-circle-line',
    reports: 'ri-bar-chart-box-line',
    mobile: 'ri-smartphone-line',
  };

  activeScreenshot(): ProductScreenshot {
    return this.screenshots.find((s) => s.id === this.active()) ?? this.screenshots[0];
  }

  getIcon(id: string): string {
    return this.icons[id] ?? 'ri-image-line';
  }

  selectScreenshot(id: string): void {
    this.active.set(id);
  }
}
