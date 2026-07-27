import { Component, Input } from '@angular/core';

/** Infinite scrolling company-name strip — inspired by Lattice's integrations marquee */
@Component({
  selector: 'app-logo-marquee',
  imports: [],
  templateUrl: './logo-marquee.component.html',
  styleUrl: './logo-marquee.component.css'
})
export class LogoMarqueeComponent {
  @Input() companies!: string[];
}
