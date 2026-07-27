import { Component, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-section-heading',
  imports: [],
  templateUrl: './section-heading.component.html',
  styleUrl: './section-heading.component.css',
})
export class SectionHeadingComponent implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private tween?: gsap.core.Timeline;

  @Input() badge?: string;
  @Input() title?: string;
  @Input() highlight?: string;
  @Input() titleBefore?: string;
  @Input() titleAfter?: string;
  @Input() subtitle?: string;
  @Input() align: 'left' | 'center' = 'left';

  ngOnInit(): void {
    const root = this.el.nativeElement;
    this.tween = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 85%', toggleActions: 'play none none none' },
    });
    const badge = root.querySelector('.section-badge');
    const title = root.querySelector('.section-title');
    const sub = root.querySelector('.section-sub');
    if (badge) this.tween.from(badge, { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out' });
    if (title) this.tween.from(title, { opacity: 0, y: 28, duration: 0.7, ease: 'power3.out' }, badge ? '-=0.2' : 0);
    if (sub) this.tween.from(sub, { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' }, '-=0.35');
  }

  ngOnDestroy(): void {
    this.tween?.scrollTrigger?.kill();
    this.tween?.kill();
  }
}
