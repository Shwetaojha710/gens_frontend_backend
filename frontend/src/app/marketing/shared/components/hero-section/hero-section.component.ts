import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';
import { FloatingParticlesComponent } from '../effects/floating-particles/floating-particles.component';
import { MagneticHoverDirective } from '../../../directives/magnetic-hover.directive';

/** Lattice-inspired animated hero with GSAP entrance for the Home page. */
@Component({
  selector: 'app-hero-section',
  imports: [CommonModule, RouterLink, FloatingParticlesComponent, MagneticHoverDirective],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css',
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private timelines: gsap.core.Timeline[] = [];

  @ViewChild('heroContent') private heroContent?: ElementRef<HTMLElement>;
  @ViewChild('heroVisual') private heroVisual?: ElementRef<HTMLElement>;

  readonly quickStats = [
    { value: '100+', label: 'Organizations' },
    { value: '99.9%', label: 'Uptime' },
    { value: '80%', label: 'Less HR Work' },
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    requestAnimationFrame(() => this.runEntrance());
  }

  ngOnDestroy(): void {
    this.timelines.forEach((t) => t.kill());
  }

  private runEntrance(): void {
    const content = this.heroContent?.nativeElement;
    const visual = this.heroVisual?.nativeElement;
    if (!content) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from(content.querySelector('.hero-badge'), { opacity: 0, y: 20, duration: 0.6 })
      .from(content.querySelectorAll('.hero-line'), { opacity: 0, y: 40, duration: 0.8, stagger: 0.15 }, '-=0.3')
      .from(content.querySelector('.hero-sub'), { opacity: 0, y: 24, duration: 0.7 }, '-=0.4')
      .from(content.querySelector('.hero-cta'), { opacity: 0, y: 20, duration: 0.6 }, '-=0.3')
      .from(content.querySelectorAll('.hero-stats > div'), { opacity: 0, y: 16, duration: 0.5, stagger: 0.1 }, '-=0.2');

    if (visual) {
      tl.from(visual, { opacity: 0, x: 60, scale: 0.95, duration: 1 }, '-=0.8');
    }

    gsap.to('.hero-orb', {
      y: '+=30',
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 1.5,
    });

    this.timelines.push(tl);
  }
}
