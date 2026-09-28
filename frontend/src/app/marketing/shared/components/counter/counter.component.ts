import { Component, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StatCounter } from '../../../data/site.models';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-counter',
  imports: [],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css'
})
export class CounterComponent implements OnInit, OnDestroy {
  @Input() stat!: StatCounter;

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private tween?: gsap.core.Tween;

  displayValue = '0';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const target = this.stat.value;
    const obj = { val: 0 };
    this.tween = gsap.to(obj, {
      val: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: this.el.nativeElement,
        start: 'top 85%',
        once: true,
      },
      onUpdate: () => {
        this.displayValue = target % 1 !== 0
          ? obj.val.toFixed(1)
          : Math.floor(obj.val).toLocaleString();
      },
    });
  }

  ngOnDestroy(): void {
    this.tween?.scrollTrigger?.kill();
    this.tween?.kill();
  }
}
