import { Component, OnInit, inject } from '@angular/core';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { CounterComponent } from '../../shared/components/counter/counter.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SeoService } from '../../services/seo.service';
import { STATS, CONTACT_INFO } from '../../data/site-data';
import { StatCounter } from '../../data/site.models';

interface CompanyValue {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-marketing-about',
  imports: [PageHeroComponent, CounterComponent, CtaBannerComponent, ScrollRevealDirective],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly companyName = CONTACT_INFO.company;
  readonly stats: StatCounter[] = STATS;

  readonly values: CompanyValue[] = [
    {
      icon: 'ri-lightbulb-flash-line',
      title: 'Innovation',
      description: 'We push the boundaries of AI and modern technology to solve real, everyday HR challenges — not just add features for their own sake.',
    },
    {
      icon: 'ri-shield-check-line',
      title: 'Trust',
      description: 'Every organization that runs its HR on GENS.Ai trusts us with sensitive employee data. We honor that with transparency, security, and reliability.',
    },
    {
      icon: 'ri-heart-3-line',
      title: 'People First',
      description: 'HR software exists to serve people, not the other way around. Every feature we build starts with the humans who will use it every day.',
    },
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'About Us',
      description: 'Learn about GENS.Ai — the AI-powered HRMS built by Quaere Etechnologies Pvt Ltd, helping Indian businesses simplify attendance, payroll, and workforce management.',
    });
  }
}
