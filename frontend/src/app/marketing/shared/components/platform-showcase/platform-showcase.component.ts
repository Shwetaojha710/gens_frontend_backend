import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';

interface PlatformTab {
  id: 'performance' | 'attendance' | 'payroll' | 'ai';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}

/** Tabbed "one platform, every HR workflow" showcase used on the Home page. */
@Component({
  selector: 'app-platform-showcase',
  imports: [CommonModule],
  templateUrl: './platform-showcase.component.html',
  styleUrl: './platform-showcase.component.css',
})
export class PlatformShowcaseComponent implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private tween?: gsap.core.Tween;

  readonly tabs: PlatformTab[] = [
    {
      id: 'performance',
      title: 'Performance',
      subtitle: 'Drive performance when you need it most.',
      description: 'Identify your best performers, grow the rest. 360° reviews, OKRs, and AI-powered insights in one place.',
      icon: 'ri-line-chart-line',
      color: 'bg-gradient-to-br from-gens-600 to-gens-400',
    },
    {
      id: 'attendance',
      title: 'Attendance & Leave',
      subtitle: 'Track time, automate approvals.',
      description: 'Biometric, geo-fencing, and shift-based attendance with real-time sync and smart leave management.',
      icon: 'ri-time-line',
      color: 'bg-gradient-to-br from-accent to-accent-light',
    },
    {
      id: 'payroll',
      title: 'Payroll',
      subtitle: 'Run payroll in minutes, not days.',
      description: 'Automated salary processing, tax compliance, and one-click payslip generation for your entire workforce.',
      icon: 'ri-money-dollar-circle-line',
      color: 'bg-gradient-to-br from-navy to-gens-700',
    },
    {
      id: 'ai',
      title: 'GENS AI',
      subtitle: 'Your always-on HR partner.',
      description: 'Ask questions in natural language, predict attrition, generate reports, and automate routine HR tasks.',
      icon: 'ri-robot-line',
      color: 'bg-gradient-to-br from-accent-orange to-accent-warm',
    },
  ];

  readonly active = signal<PlatformTab['id']>('performance');

  activeTab(): PlatformTab {
    return this.tabs.find((t) => t.id === this.active()) ?? this.tabs[0];
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.animatePanel();
    }
  }

  ngOnDestroy(): void {
    this.tween?.kill();
  }

  selectTab(id: PlatformTab['id']): void {
    if (this.active() === id) return;
    this.active.set(id);
    this.animatePanel();
  }

  private animatePanel(): void {
    const panel = this.el.nativeElement.querySelector('.platform-preview-panel');
    if (!panel) return;
    this.tween?.kill();
    this.tween = gsap.fromTo(
      panel,
      { opacity: 0, y: 16, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' },
    );
  }
}
