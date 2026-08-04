import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { PricingCardComponent, PricingCardData } from '../../shared/components/pricing-card/pricing-card.component';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { SeoService } from '../../services/seo.service';
import { FAQ_ITEMS } from '../../data/site-data';
import { PublicLandingService, PublicPlan } from '../../../services/public-landing.service';
import {  PRICING_PLANS } from '../../data/site-data';
import { PricingPlan } from '../../data/site.models';


@Component({
  selector: 'app-pricing-page',
  imports: [
    CommonModule,
    RouterLink,
    PageHeroComponent,
    SectionHeadingComponent,
    PricingCardComponent,
    FaqAccordionComponent,
    CtaBannerComponent,
  ],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css',
})
export class PricingComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly publicLanding = inject(PublicLandingService);
  private readonly router = inject(Router);

  readonly pricingFaqs = FAQ_ITEMS.slice(0, 4);

  plans: PublicPlan[] = [];
  plansLoading = true;
  loadError = false;
  currencySymbol = '₹';

  ngOnInit(): void {
    this.seo.update({
      title: 'Pricing',
      description: 'Simple, transparent pricing for GENS.Ai — the AI-powered HRMS platform. Plans for startups, growing teams, and enterprises.',
    });
    this.fetchPlans();
  }

  retryLoad(): void {
    this.plansLoading = true;
    this.loadError = false;
    this.fetchPlans();
  }

  staticCards: PricingCardData[] = [];

  private useStaticPlans(): void {
    this.staticCards = PRICING_PLANS.map(p => ({
      name: p.name,
      price: p.price,
      period: p.period,
      description: p.description,
      features: p.features,
      highlighted: p.highlighted,
      badge: p.badge,
      employees: p.employees,
      support: p.support,
      options: p.options,
      ctaLabel: p.cta,
    }));
    this.plans = [];
    this.loadError = false;
    this.plansLoading = false;
  }

  goContact(): void {
    void this.router.navigate(['/contact']);
  }

//   staticCards: PricingCardData[] = [];

// private useStaticPlans(): void {
//   this.staticCards = PRICING_PLANS.map(p => ({
//     name: p.name,
//     price: p.price,
//     period: p.period,
//     description: p.description,
//     features: p.features,
//     highlighted: p.highlighted,
//     badge: p.badge,
//     employees: p.employees,
//     support: p.support,
//     options: p.options,
//     ctaLabel: p.cta,
//   }));
//   this.plans = [];
//   this.loadError = false;
//   this.plansLoading = false;
// }
  // private fetchPlans(): void {
  //   this.publicLanding.getLanding().subscribe({
  //     next: (raw) => {
  //       try {
  //         const data = JSON.parse(raw);
  //         if (data?.status && data.data?.plans?.length) {
  //           this.plans = data.data.plans;
  //           this.currencySymbol = data.data.content?.pricing?.currencySymbol ?? '₹';
  //           this.loadError = false;
  //           this.plansLoading = false;
  //           return;
  //         }
  //       } catch { /* fall through */ }
  //       this.useStaticPlans(); // fallback
  //     },
  //     error: () => this.useStaticPlans(),
  //   });
  // }

  private fetchPlans(): void {
    this.publicLanding.getLanding().subscribe({
      next: (raw) => {
        try {
          const data = JSON.parse(raw);
          if (data?.status && data.data?.plans?.length) {
            this.plans = data.data.plans;
            this.currencySymbol = data.data.content?.pricing?.currencySymbol ?? '₹';
            this.staticCards = [];
            this.loadError = false;
            this.plansLoading = false;
            return;
          }
        } catch { /* ignore */ }
        this.useStaticPlans();
      },
      error: () => this.useStaticPlans(),
    });
  }

  toPricingCardData(plan: PublicPlan): PricingCardData {
    return {
      name: plan.name,
      price: this.formatPrice(plan),
      period: this.billingLabel(plan.billingCycle),
      description: plan.description || '',
      features: plan.bullets || [],
      highlighted: plan.highlight,
      badge: plan.supportBadge ?? undefined,
      employees: plan.maxUsers ? `Up to ${plan.maxUsers}` : undefined,
      support: plan.supportLabel ?? undefined,
      ctaLabel: 'Get Started',
    };
  }

  formatPrice(plan: PublicPlan): string {
    if (plan.price == null || Number.isNaN(Number(plan.price))) return 'Custom';
    const n = Number(plan.price);
    return `${this.currencySymbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  billingLabel(cycle: string): string {
    const c = (cycle || '').toLowerCase();
    if (c === 'yearly') return '/ year';
    if (c === 'one_time') return ' one-time';
    return '/ month';
  }

  registerWithPlan(planId: string): void {
    void this.router.navigate(['/company-reg'], { queryParams: { planId } });
  }
}
