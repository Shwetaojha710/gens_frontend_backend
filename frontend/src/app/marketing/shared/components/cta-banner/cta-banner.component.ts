import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cta-banner',
  imports: [RouterLink],
  templateUrl: './cta-banner.component.html',
  styleUrl: './cta-banner.component.css'
})
export class CtaBannerComponent {
  @Input() title = 'Your people are your business';
  @Input() subtitle = 'Ensure both are successful with GENS. Join 100+ organizations already transforming their HR.';
  @Input() primaryCtaLabel = 'Book a Demo';
  @Input() primaryCtaLink = '/contact';
  @Input() secondaryCtaLabel = 'Explore Features';
  @Input() secondaryCtaLink = '/features';
}
