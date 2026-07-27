import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HeroSectionComponent } from '../../shared/components/hero-section/hero-section.component';
import { LogoMarqueeComponent } from '../../shared/components/logo-marquee/logo-marquee.component';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { CounterComponent } from '../../shared/components/counter/counter.component';
import { PlatformShowcaseComponent } from '../../shared/components/platform-showcase/platform-showcase.component';
import { FeatureCardComponent } from '../../shared/components/feature-card/feature-card.component';
import { AiChatShowcaseComponent } from '../../shared/components/ai-chat-showcase/ai-chat-showcase.component';
import { TestimonialCardComponent } from '../../shared/components/testimonial-card/testimonial-card.component';
import { PricingCardComponent, PricingCardData } from '../../shared/components/pricing-card/pricing-card.component';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';
import { ContactFormComponent } from '../../shared/components/contact-form/contact-form.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { StaggerRevealDirective } from '../../directives/stagger-reveal.directive';
import { SeoService } from '../../services/seo.service';
import {
  TRUSTED_COMPANIES,
  STATS,
  KEY_FEATURES,
  PRICING_PLANS,
  TESTIMONIALS,
  FAQ_ITEMS,
  CONTACT_INFO,
} from '../../data/site-data';
import { StatCounter, Feature, PricingPlan, Testimonial, FaqItem } from '../../data/site.models';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterLink,
    HeroSectionComponent,
    LogoMarqueeComponent,
    SectionHeadingComponent,
    CounterComponent,
    PlatformShowcaseComponent,
    FeatureCardComponent,
    AiChatShowcaseComponent,
    TestimonialCardComponent,
    PricingCardComponent,
    FaqAccordionComponent,
    ContactFormComponent,
    CtaBannerComponent,
    ScrollRevealDirective,
    StaggerRevealDirective,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  readonly trustedCompanies: string[] = TRUSTED_COMPANIES;
  readonly stats: StatCounter[] = STATS;
  readonly keyFeatures: Feature[] = KEY_FEATURES.slice(0, 8);
  readonly testimonials: Testimonial[] = TESTIMONIALS;
  readonly homeFaqs: FaqItem[] = FAQ_ITEMS.slice(0, 5);
  readonly contactInfo = CONTACT_INFO;

  readonly aiQueries = [
    'Who is absent today?',
    'Generate payroll summary.',
    'Show attendance insights.',
    'Predict employee attrition.',
  ];

  readonly contactCards = [
    { icon: 'ri-phone-line', label: 'Phone', value: this.contactInfo.phone },
    { icon: 'ri-mail-line', label: 'Email', value: this.contactInfo.salesEmail },
    { icon: 'ri-map-pin-line', label: 'Office', value: this.contactInfo.address },
    { icon: 'ri-time-line', label: 'Hours', value: this.contactInfo.hours },
  ];

  readonly pricingTeaser: PricingCardData[] = (PRICING_PLANS as PricingPlan[]).map((plan) =>
    this.toPricingCardData(plan),
  );

  ngOnInit(): void {
    this.seo.update({
      title: 'Home',
      description:
        'GENS.Ai is an AI-powered HRMS platform for attendance, payroll, recruitment, and employee management. Book a demo today.',
      keywords: 'HRMS, AI HR, payroll software, attendance management, GENS.Ai',
    });
  }

  toPricingCardData(plan: PricingPlan): PricingCardData {
    return {
      name: plan.name,
      price: plan.price,
      period: plan.period,
      description: plan.description,
      features: plan.features,
      highlighted: plan.highlighted,
      badge: plan.badge,
      employees: plan.employees,
      support: plan.support,
      options: plan.options,
      ctaLabel: plan.cta,
    };
  }

  goToPricingPlan(): void {
    void this.router.navigate(['/pricing']);
  }
}
