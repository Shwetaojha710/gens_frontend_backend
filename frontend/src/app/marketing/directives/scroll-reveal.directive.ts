import { Directive, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type ScrollRevealAnimation = 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'scale-up';

/** Fades/slides a single element in as it scrolls into view (once). */
@Directive({
  selector: '[appScrollReveal]',
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() animation: ScrollRevealAnimation = 'fade-up';
  @Input() delay = 0;

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private tween?: gsap.core.Tween;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = this.el.nativeElement;
    const anim = this.animation;

    const fromVars: gsap.TweenVars = { opacity: 0, duration: 0.9, delay: this.delay, ease: 'power3.out' };
    if (anim === 'fade-up') fromVars['y'] = 48;
    if (anim === 'slide-left') fromVars['x'] = -48;
    if (anim === 'slide-right') fromVars['x'] = 48;
    if (anim === 'scale-up') {
      fromVars['scale'] = 0.92;
      fromVars['y'] = 24;
    }

    this.tween = gsap.from(element, {
      ...fromVars,
      scrollTrigger: {
        trigger: element,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });
  }

  ngOnDestroy(): void {
    this.tween?.scrollTrigger?.kill();
    this.tween?.kill();
  }
}
