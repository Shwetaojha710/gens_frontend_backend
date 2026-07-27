import { Component, OnInit, inject } from '@angular/core';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { FeatureCardComponent } from '../../shared/components/feature-card/feature-card.component';
import { AiChatShowcaseComponent } from '../../shared/components/ai-chat-showcase/ai-chat-showcase.component';
import { ProductGalleryComponent } from '../../shared/components/product-gallery/product-gallery.component';
import { LocationTrackingShowcaseComponent } from '../../shared/components/location-tracking-showcase/location-tracking-showcase.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { StaggerRevealDirective } from '../../directives/stagger-reveal.directive';
import { SeoService } from '../../services/seo.service';
import { KEY_FEATURES } from '../../data/site-data';
import { Feature } from '../../data/site.models';

@Component({
  selector: 'app-features',
  imports: [
    PageHeroComponent,
    SectionHeadingComponent,
    FeatureCardComponent,
    AiChatShowcaseComponent,
    ProductGalleryComponent,
    LocationTrackingShowcaseComponent,
    CtaBannerComponent,
    ScrollRevealDirective,
    StaggerRevealDirective,
  ],
  templateUrl: './features.component.html',
  styleUrl: './features.component.css'
})
export class FeaturesComponent implements OnInit {
  private readonly seo = inject(SeoService);
  readonly keyFeatures: Feature[] = KEY_FEATURES;

  ngOnInit(): void {
    this.seo.update({
      title: 'Features',
      description: "Explore GENS.Ai's full HR feature set — employee management, attendance, payroll, recruitment, performance, location tracking, and an AI assistant, all in one platform.",
      keywords: 'HRMS features, employee management, attendance tracking, payroll software, recruitment ATS, performance management, location tracking, AI HR assistant',
    });
  }
}
