import { Directive, ElementRef, HostListener, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';

/** Subtle magnetic pull on hover for buttons and cards */
@Directive({
  selector: '[appMagneticHover]',
  standalone: true,
})
export class MagneticHoverDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private tween?: gsap.core.Tween;

  @HostListener('mouseenter')
  onEnter(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.to(this.el.nativeElement, { scale: 1.03, duration: 0.3, ease: 'power2.out' });
  }

  @HostListener('mousemove', ['$event'])
  onMove(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    this.tween?.kill();
    this.tween = gsap.to(this.el.nativeElement, {
      x: x * 0.18,
      y: y * 0.18,
      duration: 0.35,
      ease: 'power2.out',
    });
  }

  @HostListener('mouseleave')
  onLeave(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.tween?.kill();
    gsap.to(this.el.nativeElement, { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  }

  ngOnDestroy(): void {
    this.tween?.kill();
  }
}
