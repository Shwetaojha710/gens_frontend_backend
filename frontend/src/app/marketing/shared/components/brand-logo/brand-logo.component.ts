import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Horizontal GENS.Ai logo: lady icon -> brand text */
@Component({
  selector: 'app-brand-logo',
  imports: [RouterLink],
  templateUrl: './brand-logo.component.html',
  styleUrl: './brand-logo.component.css'
})
export class BrandLogoComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showTagline = false;
}
