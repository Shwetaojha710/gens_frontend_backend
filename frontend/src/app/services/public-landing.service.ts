import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LandingHero {
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  trustLine: string;
}

export interface LandingFeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface LandingFeatures {
  kicker: string;
  title: string;
  subtitle: string;
  items: LandingFeatureItem[];
}

export interface LandingPricingIntro {
  kicker: string;
  title: string;
  subtitle: string;
  currencySymbol: string;
  footerNote?: string;
}

export interface LandingSubscription {
  title: string;
  subtitle: string;
  bullets: string[];
}

export interface LandingStatItem {
  icon: string;
  value: string;
  label: string;
}

export interface LandingFaqItem {
  q: string;
  a: string;
}

export interface LandingFaq {
  kicker: string;
  title: string;
  subtitle: string;
  items: LandingFaqItem[];
}

export interface LandingCta {
  title: string;
  subtitle: string;
  buttonLabel: string;
  buttonHref: string;
}

export interface LandingContact {
  kicker: string;
  title: string;
  subtitle: string;
  cardTagline: string;
  cardTitle: string;
  cardBody: string;
  formTitle: string;
  /** When false, public form is closed (SuperAdmin). Default true if omitted. */
  formEnabled?: boolean;
  formHelpText?: string;
  namePlaceholder?: string;
  emailPlaceholder?: string;
  messagePlaceholder?: string;
  submitButtonLabel?: string;
  formClosedMessage?: string;
}

export interface LandingContent {
  hero: LandingHero;
  features: LandingFeatures;
  pricing: LandingPricingIntro;
  subscription: LandingSubscription;
  stats: { items: LandingStatItem[] };
  faq: LandingFaq;
  cta: LandingCta;
  contact: LandingContact;
}

export interface PublicPlan {
  id: string;
  name: string;
  code: string | null;
  price: number | null;
  billingCycle: string;
  durationDays: number | null;
  maxUsers: number | null;
  description: string | null;
  highlight: boolean;
  supportLabel: string | null;
  supportBadge: string | null;
  bullets: string[];
}

export interface PublicLandingResponse {
  content: LandingContent;
  plans: PublicPlan[];
}

@Injectable({ providedIn: 'root' })
export class PublicLandingService {
  constructor(private http: HttpClient) {}

  private base(): string {
    const ls = localStorage.getItem('base_url');
    if (ls && ls.trim()) return ls.trim();
    return environment.apiUrl;
  }

  getLanding(): Observable<string> {
    return this.http.get(`${this.base()}public/landing`, { responseType: 'text' });
  }

  /** Public POST — body is validated and sanitised on the server */
  submitContact(body: { fullName: string; email: string; message: string }): Observable<string> {
    return this.http.post(`${this.base()}public/contact`, body, { responseType: 'text' });
  }

  /** Single plan for registration / payment gating (no secrets). */
  getPublicPlan(planId: string): Observable<string> {
    const id = encodeURIComponent(planId.trim());
    return this.http.get(`${this.base()}public/plan/${id}`, { responseType: 'text' });
  }

  startRazorpaySubscription(body: { planId: string; email: string; name: string }): Observable<string> {
    return this.http.post(`${this.base()}public/razorpay/subscription-start`, body, { responseType: 'text' });
  }
}
