import { Component } from '@angular/core';

/**
 * Site-wide fixed ambient gradient background (mounted once by the
 * marketing shell). Purely decorative — sits behind all page content at
 * `z-index: -1` and never intercepts pointer events.
 */
@Component({
  selector: 'app-animated-brand-bg',
  imports: [],
  templateUrl: './animated-brand-bg.component.html',
  styleUrl: './animated-brand-bg.component.css'
})
export class AnimatedBrandBgComponent {}
