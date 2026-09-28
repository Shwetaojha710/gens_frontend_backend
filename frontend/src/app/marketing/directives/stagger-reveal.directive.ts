import { Directive, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Fades/slides a container's direct children in with a stagger as the container scrolls into view (once). */
@Directive({
  selector: '[appStaggerReveal]',
})
export class StaggerRevealDirective implements OnInit, OnDestroy {
  @Input() stagger = 0.08;
  /** Must be a valid Selectors API string (use :scope for child combinators) */
  @Input() childSelector = ':scope > *';

  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private tween?: gsap.core.Tween;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = this.el.nativeElement as HTMLElement;
    let children: Element[] = [];
    try {
      children = Array.from(root.querySelectorAll(this.childSelector));
    } catch {
      children = Array.from(root.children);
    }
    if (!children.length) {
      children = Array.from(root.children);
    }
    if (!children.length) return;

    gsap.set(children, { opacity: 0, y: 28, filter: 'blur(4px)' });

    this.tween = gsap.to(children, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.75,
      stagger: this.stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: root,
        start: 'top 84%',
        toggleActions: 'play none none none',
      },
    });
  }

  ngOnDestroy(): void {
    this.tween?.scrollTrigger?.kill();
    this.tween?.kill();
  }
}
