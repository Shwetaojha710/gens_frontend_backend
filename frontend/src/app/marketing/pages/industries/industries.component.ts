import { Component, OnInit, inject } from '@angular/core';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { StaggerRevealDirective } from '../../directives/stagger-reveal.directive';
import { SeoService } from '../../services/seo.service';
import { INDUSTRIES } from '../../data/site-data';
import { Industry } from '../../data/site.models';

@Component({
  selector: 'app-industries',
  imports: [PageHeroComponent, CtaBannerComponent, StaggerRevealDirective],
  templateUrl: './industries.component.html',
  styleUrl: './industries.component.css'
})
export class IndustriesComponent implements OnInit {
  private readonly seo = inject(SeoService);
  readonly industries: Industry[] = INDUSTRIES;

  ngOnInit(): void {
    this.seo.update({
      title: 'Industries',
      description: 'GENS.Ai HRMS for healthcare, education, IT, manufacturing, government, retail, finance, construction, logistics, and NGOs — purpose-built for every industry.',
      keywords: 'HRMS for healthcare, HRMS for education, HRMS for manufacturing, HRMS for retail, HRMS for government, industry HR software',
    });
  }
}
