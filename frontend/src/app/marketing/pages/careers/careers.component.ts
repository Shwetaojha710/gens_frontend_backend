import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SeoService } from '../../services/seo.service';
import { CAREERS } from '../../data/site-data';
import { Career } from '../../data/site.models';

@Component({
  selector: 'app-marketing-careers',
  imports: [RouterLink, PageHeroComponent, CtaBannerComponent, ScrollRevealDirective],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.css'
})
export class CareersComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly careers: Career[] = CAREERS;

  ngOnInit(): void {
    this.seo.update({
      title: 'Careers',
      description: 'Join the GENS.Ai team. Explore open positions in engineering, design, sales, marketing, and customer success.',
    });
  }
}
