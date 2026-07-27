import { Component, OnInit, inject } from '@angular/core';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { SeoService } from '../../services/seo.service';
import { FAQ_ITEMS } from '../../data/site-data';
import { FaqItem } from '../../data/site.models';

@Component({
  selector: 'app-faqs',
  imports: [PageHeroComponent, FaqAccordionComponent, CtaBannerComponent],
  templateUrl: './faqs.component.html',
  styleUrl: './faqs.component.css'
})
export class FaqsComponent implements OnInit {
  private readonly seo = inject(SeoService);
  readonly faqItems: FaqItem[] = FAQ_ITEMS;

  ngOnInit(): void {
    this.seo.update({
      title: 'FAQs',
      description: 'Find answers to frequently asked questions about GENS.Ai — pricing, features, security, data migration, integrations, and more.',
    });
  }
}
