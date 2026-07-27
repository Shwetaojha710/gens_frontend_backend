import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Presentational contract for the pricing card. Deliberately decoupled from
 *  any specific data source (site-data.ts's static PricingPlan, a live plan
 *  fetched from the backend, etc.) so this component can render either — the
 *  consuming page maps its own plan shape into this before passing it in. */
export interface PricingCardOption {
  label: string;
  included: boolean;
}

export interface PricingCardData {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  employees?: string;
  support?: string;
  options?: PricingCardOption[];
  ctaLabel: string;
}

@Component({
  selector: 'app-pricing-card',
  imports: [CommonModule],
  templateUrl: './pricing-card.component.html',
  styleUrl: './pricing-card.component.css'
})
export class PricingCardComponent {
  @Input({ required: true }) plan!: PricingCardData;
  @Output() ctaClick = new EventEmitter<void>();

  private readonly previewCount = 5;
  readonly expanded = signal(false);

  readonly visibleFeatures = computed(() => {
    const all = this.plan?.features ?? [];
    return this.expanded() ? all : all.slice(0, this.previewCount);
  });

  readonly hiddenCount = computed(() =>
    Math.max(0, (this.plan?.features?.length ?? 0) - this.previewCount)
  );

  toggleExpanded(): void {
    this.expanded.set(!this.expanded());
  }

  onCtaClick(): void {
    this.ctaClick.emit();
  }
}
