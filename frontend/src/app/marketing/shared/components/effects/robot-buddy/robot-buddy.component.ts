import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import gsap from 'gsap';
import { WebsiteChatTriggerService } from '../../../../services/website-chat-trigger.service';

interface Bubble {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface QuickAction {
  label: string;
  path: string;
  icon: string;
}

const ROBOT_SIZE = 56;
const EDGE_PAD = 16;
const HEADER_SAFE = 72;
const DRAG_THRESHOLD = 6;

/**
 * Cute walking mascot — roams the viewport with physics-based drift (bounces
 * off edges, flips to face its direction, gentle bob/foot-tap via gsap),
 * click opens a route-aware tip panel. Disabled outside desktop widths and
 * under `prefers-reduced-motion: reduce` (checked once + on resize, not via
 * CSS, so the animation loop itself never runs when it shouldn't).
 */
@Component({
  selector: 'app-robot-buddy',
  imports: [CommonModule],
  templateUrl: './robot-buddy.component.html',
  styleUrl: './robot-buddy.component.css'
})
export class RobotBuddyComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly chatTrigger = inject(WebsiteChatTriggerService);

  readonly enabled = signal(false);
  readonly panelOpen = signal(false);
  /** Speech chip: "Want to ask something?" — click opens website chatbot. */
  readonly askPromptOpen = signal(false);
  readonly robotX = signal(0);
  readonly robotY = signal(HEADER_SAFE);
  readonly blinking = signal(false);
  readonly dragging = signal(false);
  readonly bubbles = signal<Bubble[]>([]);
  readonly currentRoute = signal('/');
  readonly scrollSection = signal('');

  readonly panelX = computed(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    return Math.min(Math.max(EDGE_PAD, this.robotX() - 90), w - 280);
  });

  readonly panelY = computed(() => {
    const h = typeof window !== 'undefined' ? window.innerHeight : 600;
    const below = this.robotY() + ROBOT_SIZE + 10;
    return below + 240 > h ? Math.max(EDGE_PAD, this.robotY() - 250) : below;
  });

  readonly currentTip = computed(() => {
    const route = this.currentRoute().toLowerCase();
    const section = this.scrollSection();
    if (section === 'pricing') return '💡 Most teams save 70% HR time with the Professional plan.';
    if (section === 'contact') return '📩 Book a free demo — our team responds within 24 hours!';
    if (section === 'ai-assistant') return '🤖 Try asking GENS AI about attendance, payroll, or attrition.';
    if (route.includes('pricing')) return 'Compare Basic, Standard, Professional & Enterprise plans below.';
    if (route.includes('contact')) return "Tell us your team size — we'll recommend the best plan.";
    if (route.includes('features')) return 'Explore 12 integrated HR modules on this page.';
    if (route.includes('solutions')) return 'See how GENS.Ai solves problems for teams like yours.';
    if (route.includes('industries')) return 'GENS.Ai adapts to your industry — take a look.';
    if (route.includes('faqs')) return "Can't find your answer? Contact us anytime!";
    if (route.includes('about')) return 'Meet the team building GENS.Ai.';
    return "👋 Hi! I'm your GENS guide. Click me for quick tips & actions!";
  });

  readonly quickActions = computed<QuickAction[]>(() => {
    const route = this.currentRoute().toLowerCase();

    if (route.includes('pricing')) {
      return [
        { label: 'Book a Demo', path: '/contact', icon: '📅' },
        { label: 'Compare Plans', path: '/pricing', icon: '📊' },
        { label: 'Contact Sales', path: '/contact', icon: '💬' },
      ];
    }
    if (route.includes('features')) {
      return [
        { label: 'See Pricing', path: '/pricing', icon: '💰' },
        { label: 'Book a Demo', path: '/contact', icon: '📅' },
        { label: 'View Solutions', path: '/solutions', icon: '🧩' },
      ];
    }
    if (route.includes('contact')) {
      return [
        { label: 'View Pricing', path: '/pricing', icon: '💰' },
        { label: 'Explore Features', path: '/features', icon: '✨' },
      ];
    }
    if (route === '/' || route.includes('home')) {
      return [
        { label: 'Explore Features', path: '/features', icon: '✨' },
        { label: 'See Pricing', path: '/pricing', icon: '💰' },
        { label: 'Book a Demo', path: '/contact', icon: '📅' },
        { label: 'FAQs', path: '/faqs', icon: '❓' },
      ];
    }
    return [
      { label: 'Contact Sales', path: '/contact', icon: '💬' },
      { label: 'View Pricing', path: '/pricing', icon: '💰' },
      { label: 'All Features', path: '/features', icon: '⚡' },
      { label: 'About GENS', path: '/about', icon: '🏢' },
    ];
  });

  private velX = 0.045;
  private velY = 0.032;
  private rafId = 0;
  private lastTime = 0;
  private lastDirChange = 0;
  private bubbleId = 0;
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private routerSub?: Subscription;
  private idleInterval?: ReturnType<typeof setInterval>;
  private lastActivity = Date.now();
  private sectionObserver?: IntersectionObserver;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private didDrag = false;
  private pointerId: number | null = null;

  private readonly helpfulTips = [
    'Tip: GENS.Ai automates the busywork so your team can focus on people.',
    'Did you know? AI can flag attendance issues before they snowball.',
    '14-day free trial — no credit card needed!',
    'Scroll around — there is a lot to see on this page!',
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    this.enabled.set(!reducedMotion && isDesktop);
    if (!this.enabled()) return;

    const { minX, maxX, minY } = this.bounds();
    this.robotX.set(Math.max(minX, maxX - 24));
    this.robotY.set(minY + 4);
    this.pickRandomVelocity();

    this.currentRoute.set(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentRoute.set(event.urlAfterRedirects);
        this.closePanel();
        this.spawnBubble(this.getRouteWelcome(event.urlAfterRedirects));
        // Home sections mount after navigation — rebind IntersectionObserver.
        queueMicrotask(() => this.setupSectionObserver());
      });

    this.setupSectionObserver();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
    this.scheduleBlink();
    this.scheduleIdleCheck();
    this.scheduleAmbientTip();

    const timer = setTimeout(() => {
      this.spawnBubble('Need a hand? Click me anytime! ✨');
    }, 3500);
    this.timers.push(timer);
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.timers.forEach((t) => clearTimeout(t));
    if (this.idleInterval) clearInterval(this.idleInterval);
    this.routerSub?.unsubscribe();
    this.sectionObserver?.disconnect();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldEnable = !reducedMotion && isDesktop;
    if (!shouldEnable) {
      this.enabled.set(false);
      this.closePanel();
      return;
    }
    if (!this.enabled()) {
      this.enabled.set(true);
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.tick);
    }
    this.clampPosition();
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:scroll')
  onActivity(): void {
    this.lastActivity = Date.now();
  }

  @HostListener('document:mouseover', ['$event'])
  onHoverTarget(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('a.btn-primary, a[routerLink="/contact"]') && Math.random() < 0.25) {
      this.spawnBubble('Great choice! 🎯');
    }
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging() || this.pointerId !== event.pointerId) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      this.didDrag = true;
    }
    const { minX, maxX, minY, maxY } = this.bounds();
    const nextX = Math.min(maxX, Math.max(minX, event.clientX - this.dragOffsetX));
    const nextY = Math.min(maxY, Math.max(minY, event.clientY - this.dragOffsetY));
    this.robotX.set(nextX);
    this.robotY.set(nextY);
    this.lastActivity = Date.now();
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.dragging.set(false);
    this.pointerId = null;
    this.pickRandomVelocity();
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.pointerId = event.pointerId;
    this.dragging.set(true);
    this.didDrag = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragOffsetX = event.clientX - this.robotX();
    this.dragOffsetY = event.clientY - this.robotY();
    this.closePanel();
    gsap.set('.robot-buddy', { y: 0 });
  }
  askDraft :any= '';

  submitAsk(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const text = this.askDraft.trim();
    this.askDraft = '';
    this.closePanel();
    this.chatTrigger.openChat();
    // optional: agar chatbot me pehle message bhejna ho to service me startWith bhi expose karo
  }
  onBuddyClick(event: MouseEvent): void {
    if (this.didDrag) {
      event.preventDefault();
      event.stopPropagation();
      this.didDrag = false;
      return;
    }
    this.askPromptOpen.set(false);
    this.togglePanel();
    // this.closePanel();
    this.askPromptOpen.update((open) => !open);
    if (this.askPromptOpen() && isPlatformBrowser(this.platformId)) {
      gsap.from('.robot-ask-chip', {
        opacity: 0,
        y: 8,
        scale: 0.94,
        duration: 0.28,
        ease: 'back.out(1.4)',
      });
    }
  }

  askSomething(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.askPromptOpen.set(false);
    this.closePanel();
    this.chatTrigger.openChat();
  }

  togglePanel(): void {
    this.askPromptOpen.set(false);
    this.panelOpen.update((open) => !open);
    if (this.panelOpen() && isPlatformBrowser(this.platformId)) {
      gsap.from('.robot-panel', { opacity: 0, y: 12, scale: 0.95, duration: 0.35, ease: 'back.out(1.5)' });
    }
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.askPromptOpen.set(false);
  }

  navigate(path: string): void {
    this.closePanel();
    this.router.navigate([path]);
    this.spawnBubble('On my way! →');
  }

  private getRouteWelcome(url: string): string {
    const route = url.toLowerCase();
    if (route.includes('pricing')) return 'Checking prices? 💰';
    if (route.includes('contact')) return "Let's connect! 📬";
    if (route.includes('features')) return 'So many features! ⚡';
    if (route.includes('about')) return 'Meet the GENS.Ai team! 🏢';
    return 'Welcome! ✨';
  }

  private setupSectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.sectionObserver?.disconnect();
    const ids = ['ai-assistant', 'contact', 'pricing'];
    const tips: Record<string, string> = {
      'ai-assistant': 'AI section ahead! 🤖',
      contact: "Need help? I'm here! 💬",
      pricing: 'Compare plans here! 📊',
    };
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.scrollSection.set(entry.target.id);
            const tip = tips[entry.target.id];
            if (tip) this.spawnBubble(tip);
          }
        }
      },
      { threshold: 0.4 },
    );
    ids.forEach((id) => {
      const el = this.doc.getElementById(id);
      if (el) this.sectionObserver?.observe(el);
    });
  }

  private pickRandomVelocity(): void {
    const speed = 0.028 + Math.random() * 0.035;
    const angle = Math.random() * Math.PI * 2;
    this.velX = Math.cos(angle) * speed;
    this.velY = Math.sin(angle) * speed;
  }

  private bounds() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      minX: EDGE_PAD,
      maxX: Math.max(EDGE_PAD, w - ROBOT_SIZE - EDGE_PAD),
      minY: HEADER_SAFE,
      maxY: Math.max(HEADER_SAFE, h - ROBOT_SIZE - EDGE_PAD),
    };
  }

  private clampPosition(): void {
    const { minX, maxX, minY, maxY } = this.bounds();
    this.robotX.set(Math.min(maxX, Math.max(minX, this.robotX())));
    this.robotY.set(Math.min(maxY, Math.max(minY, this.robotY())));
  }

  private tick = (time: number) => {
    if (!this.enabled() || !isPlatformBrowser(this.platformId)) return;
    if (this.panelOpen() || this.askPromptOpen() || this.dragging()) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    const dt = Math.min(32, time - this.lastTime);
    this.lastTime = time;

    if (time - this.lastDirChange > 3500 + Math.random() * 2500) {
      this.pickRandomVelocity();
      this.lastDirChange = time;
    }

    const { minX, maxX, minY, maxY } = this.bounds();
    let nextX = this.robotX() + this.velX * dt;
    let nextY = this.robotY() + this.velY * dt;

    if (nextX <= minX) { nextX = minX; this.velX = Math.abs(this.velX); }
    else if (nextX >= maxX) { nextX = maxX; this.velX = -Math.abs(this.velX); }

    if (nextY <= minY) { nextY = minY; this.velY = Math.abs(this.velY); }
    else if (nextY >= maxY) { nextY = maxY; this.velY = -Math.abs(this.velY); }

    const bob = Math.sin(time / 320) * 3;
    this.robotX.set(nextX);
    this.robotY.set(nextY);

    gsap.set('.robot-buddy', { y: bob });
    gsap.to('.robot-buddy', {
      rotationY: this.velX >= 0 ? 0 : 180,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to('.robot-foot', {
      y: Math.sin(time / 110) * 2.5,
      duration: 0.1,
      stagger: 0.05,
    });

    this.rafId = requestAnimationFrame(this.tick);
  };

  private spawnBubble(text: string): void {
    const id = this.bubbleId++;
    this.bubbles.update((list) => [
      ...list.slice(-2),
      { id, x: this.robotX() + ROBOT_SIZE / 2, y: this.robotY() - 18, text },
    ]);
    const timer = setTimeout(() => {
      this.bubbles.update((list) => list.filter((item) => item.id !== id));
    }, 2200);
    this.timers.push(timer);
  }

  private scheduleBlink(): void {
    const timer = setTimeout(() => {
      this.blinking.set(true);
      setTimeout(() => this.blinking.set(false), 150);
      this.scheduleBlink();
    }, 3000 + Math.random() * 4000);
    this.timers.push(timer);
  }

  private scheduleIdleCheck(): void {
    this.idleInterval = setInterval(() => {
      if (Date.now() - this.lastActivity > 18000 && !this.panelOpen() && !this.askPromptOpen()) {
        this.spawnBubble('Still browsing? I can help! 👋');
        this.lastActivity = Date.now();
      }
    }, 5000);
  }

  private scheduleAmbientTip(): void {
    const timer = setTimeout(() => {
      if (this.enabled() && !this.panelOpen() && !this.askPromptOpen()) {
        const tip = this.helpfulTips[Math.floor(Math.random() * this.helpfulTips.length)];
        this.spawnBubble(tip);
      }
      this.scheduleAmbientTip();
    }, 12000);
    this.timers.push(timer);
  }
}
