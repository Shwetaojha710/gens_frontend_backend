import { Component, Input, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface Particle {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  variant: 'float' | 'float-delayed';
}

/**
 * Ambient decorative dots that drift slowly using the Tailwind
 * `animate-float` / `animate-float-delayed` keyframes. Purely visual —
 * generates its randomized layout once on init and skips generating any
 * particles at all under `prefers-reduced-motion: reduce`.
 */
@Component({
  selector: 'app-floating-particles',
  imports: [],
  templateUrl: './floating-particles.component.html',
  styleUrl: './floating-particles.component.css'
})
export class FloatingParticlesComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);

  /** Number of particles to generate. */
  @Input() count = 22;

  particles: Particle[] = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.particles = Array.from({ length: this.count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 5,
      duration: 6 + Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.35,
      variant: i % 2 === 0 ? 'float' : 'float-delayed',
    }));
  }
}
