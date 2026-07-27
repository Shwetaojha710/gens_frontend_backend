import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';

interface StatCard {
  label: string;
  value: string;
  color: string;
}

/** Decorative fake product-dashboard card: stat tiles, bar chart, progress ring, activity feed. */
@Component({
  selector: 'app-dashboard-mockup',
  imports: [CommonModule],
  templateUrl: './dashboard-mockup.component.html',
  styleUrl: './dashboard-mockup.component.css',
})
export class DashboardMockupComponent implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private tweens: gsap.core.Tween[] = [];
  private introTimeout?: ReturnType<typeof setTimeout>;

  readonly statCards: StatCard[] = [
    { label: 'Employees', value: '248', color: 'text-gens-600' },
    { label: 'Present', value: '234', color: 'text-green-500' },
    { label: 'On Leave', value: '14', color: 'text-amber-500' },
  ];
  readonly barHeights = [60, 75, 80, 70, 90, 85, 95];
  readonly activities = ['Payroll processed for July', '3 new hires onboarded', 'Leave approved: Sarah M.'];

  readonly ringRadius = 15.5;
  readonly ringCircumference = 2 * Math.PI * this.ringRadius;
  readonly leaveUsedPct = 0.78;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.introTimeout = setTimeout(() => this.animate(), 600);
  }

  ngOnDestroy(): void {
    if (this.introTimeout) clearTimeout(this.introTimeout);
    this.tweens.forEach((t) => t.kill());
  }

  private animate(): void {
    const root = this.el.nativeElement;

    this.tweens.push(
      gsap.from(root.querySelectorAll('.mock-stat'), {
        opacity: 0,
        y: 16,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.3,
      }),
      gsap.from(root.querySelectorAll('.mock-bar'), {
        scaleY: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'back.out(1.4)',
        delay: 0.6,
        transformOrigin: 'bottom',
      }),
      gsap.to(root.querySelector('.progress-ring'), {
        strokeDashoffset: this.ringCircumference * (1 - this.leaveUsedPct),
        duration: 1.5,
        ease: 'power2.out',
        delay: 0.8,
      }),
      gsap.to(root.querySelectorAll('.mock-activity'), {
        opacity: 1,
        x: 0,
        duration: 0.4,
        stagger: 0.15,
        ease: 'power2.out',
        delay: 1,
      }),
    );
  }
}
