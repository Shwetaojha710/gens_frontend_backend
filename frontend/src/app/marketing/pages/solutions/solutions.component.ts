import { Component, OnInit, inject } from '@angular/core';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SeoService } from '../../services/seo.service';
import { SOLUTIONS } from '../../data/site-data';
import { Solution } from '../../data/site.models';

@Component({
  selector: 'app-solutions',
  imports: [PageHeroComponent, CtaBannerComponent, ScrollRevealDirective],
  templateUrl: './solutions.component.html',
  styleUrl: './solutions.component.css'
})
export class SolutionsComponent implements OnInit {
  private readonly seo = inject(SeoService);
  readonly solutions: Solution[] = SOLUTIONS;

  ngOnInit(): void {
    this.seo.update({
      title: 'Solutions',
      description: 'Tailored GENS.Ai solutions for HR teams, managers, employees, and enterprises — purpose-built tools that streamline workflows at every level of your organization.',
      keywords: 'HR solutions, HR team tools, manager dashboards, employee self service, enterprise HR platform',
    });
  }
}
