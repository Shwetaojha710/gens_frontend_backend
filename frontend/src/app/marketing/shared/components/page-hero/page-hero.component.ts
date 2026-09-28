import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-page-hero',
  imports: [CommonModule, RouterLink, ScrollRevealDirective],
  templateUrl: './page-hero.component.html',
  styleUrl: './page-hero.component.css'
})
export class PageHeroComponent {
  @Input() badge?: string;
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() ctaLabel?: string;
  @Input() ctaLink?: string;

  get showCta(): boolean {
    return !!(this.ctaLabel && this.ctaLink);
  }
}
