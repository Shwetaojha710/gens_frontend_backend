import { Component, OnInit, inject } from '@angular/core';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { BlogCardComponent } from '../../shared/components/blog-card/blog-card.component';
import { CtaBannerComponent } from '../../shared/components/cta-banner/cta-banner.component';
import { StaggerRevealDirective } from '../../directives/stagger-reveal.directive';
import { SeoService } from '../../services/seo.service';
import { BLOG_POSTS } from '../../data/site-data';
import { BlogPost } from '../../data/site.models';

@Component({
  selector: 'app-marketing-blog',
  imports: [PageHeroComponent, BlogCardComponent, CtaBannerComponent, StaggerRevealDirective],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css'
})
export class BlogComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly posts: BlogPost[] = BLOG_POSTS;

  ngOnInit(): void {
    this.seo.update({
      title: 'Blog',
      description: 'HR insights, tips, and best practices from the GENS.Ai team. Stay updated on AI HRMS, attendance, payroll, and workforce management trends.',
    });
  }
}
