import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, finalize, Subscription } from 'rxjs';
import { LandingFooterComponent } from '../landing-footer/landing-footer.component';
import { LandingHeaderComponent } from '../landing-header/landing-header.component';
import {
  LandingContent,
  PublicLandingService,
  PublicPlan,
} from '../services/public-landing.service';

@Component({
  selector: 'app-landing-page',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    LandingHeaderComponent,
    LandingFooterComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent implements OnInit, OnDestroy {
  loading = true;
  loadError = false;
  content: LandingContent | null = null;
  plans: PublicPlan[] = [];
  contactSubmitting = false;
  contactFeedback: { ok: boolean; text: string } | null = null;
  contactForm: FormGroup;
  private navSub?: Subscription;
  private fragSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private publicLanding: PublicLandingService,
    private fb: FormBuilder,
  ) {
    this.contactForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(8000)]],
    });
  }

  ngOnInit(): void {
    localStorage.clear();
    this.fragSub = this.route.fragment.subscribe((frag) => {
      if (frag) this.scheduleScrollTo(frag);
    });
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const frag = this.router.parseUrl(this.router.url).fragment;
        if (frag) this.scheduleScrollTo(frag);
      });
    this.fetchLanding();
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.fragSub?.unsubscribe();
  }

  /** Remix Icon font needs `ri` + `ri-*` (CMS may store only `ri-calculator-line`). */
  remixIcon(icon?: string | null): string {
    const s = (icon || 'ri-apps-line').trim();
    if (!s) return 'ri ri-apps-line';
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts[0] === 'ri' && parts.length > 1) {
      return parts.join(' ');
    }
    if (s.startsWith('ri-')) {
      return `ri ${s}`;
    }
    return `ri ri-${s.replace(/^ri-/, '')}`;
  }

  retryLoad(): void {
    this.loading = true;
    this.loadError = false;
    this.fetchLanding();
  }

  private fetchLanding(): void {
    this.publicLanding.getLanding().subscribe({
      next: (raw) => {
        try {
          const data = JSON.parse(raw);
          if (data?.status && data.data) {
            this.content = data.data.content;
            this.plans = data.data.plans || [];
            this.loadError = false;
            queueMicrotask(() => {
              const frag = this.route.snapshot.fragment || this.router.parseUrl(this.router.url).fragment;
              if (frag) this.scheduleScrollTo(frag);
            });
          } else {
            this.loadError = true;
          }
        } catch {
          this.loadError = true;
        }
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  goHref(href: string): void {
    if (!href) return;
    const h = href.trim();
    if (h.startsWith('#')) {
      const id = h.slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (h.startsWith('/')) {
      void this.router.navigateByUrl(h);
    }
  }

  registerWithPlan(planId: string): void {
    void this.router.navigate(['/company-reg'], { queryParams: { planId } });
  }

  billingLabel(cycle: string): string {
    const c = (cycle || '').toLowerCase();
    if (c === 'yearly') return '/ year';
    if (c === 'one_time') return ' one-time';
    return '/ month';
  }

  formatPrice(plan: PublicPlan): string {
    if (plan.price == null || Number.isNaN(Number(plan.price))) return 'Custom';
    const sym = this.content?.pricing?.currencySymbol ?? '₹';
    const n = Number(plan.price);
    return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  /** Public contact form is on unless SuperAdmin explicitly disables it */
  contactFormOpen(c: LandingContent): boolean {
    return c.contact?.formEnabled !== false;
  }

  submitContact(): void {
    if (this.contactSubmitting) return;
    this.contactFeedback = null;
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    const v = this.contactForm.getRawValue();
    this.contactSubmitting = true;
    this.publicLanding
      .submitContact({
        fullName: String(v.fullName || '').trim(),
        email: String(v.email || '').trim(),
        message: String(v.message || '').trim(),
      })
      .pipe(finalize(() => (this.contactSubmitting = false)))
      .subscribe({
        next: (raw) => {
          try {
            const data = JSON.parse(raw) as { status?: boolean; message?: string };
            if (data?.status) {
              this.contactFeedback = { ok: true, text: data.message || 'Thank you.' };
              this.contactForm.reset();
            } else {
              this.contactFeedback = { ok: false, text: data?.message || 'Could not send your message.' };
            }
          } catch {
            this.contactFeedback = { ok: false, text: 'Unexpected response from server.' };
          }
        },
        error: (err: HttpErrorResponse) => {
          let msg = 'Could not reach the server.';
          if (err.status === 429) {
            msg = 'Too many attempts. Please try again later.';
          }
          if (typeof err.error === 'string' && err.error.trim()) {
            try {
              const d = JSON.parse(err.error) as { message?: string };
              if (d?.message) msg = d.message;
            } catch {
              /* keep msg */
            }
          }
          this.contactFeedback = { ok: false, text: msg };
        },
      });
  }

  /** Fragment targets (e.g. from nav) — retry until section DOM exists. */
  private scheduleScrollTo(elementId: string): void {
    const run = () => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };
    if (run()) return;
    [0, 50, 150, 350, 600].forEach((ms) => setTimeout(() => run(), ms));
  }
}
