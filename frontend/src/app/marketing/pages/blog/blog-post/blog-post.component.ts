import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CtaBannerComponent } from '../../../shared/components/cta-banner/cta-banner.component';
import { SeoService } from '../../../services/seo.service';
import { BLOG_POSTS } from '../../../data/site-data';
import { BlogPost } from '../../../data/site.models';

/**
 * Blog post detail page, routed as `blog/:slug`.
 *
 * Angular can reuse this component instance when navigating directly from
 * one blog-post route to another (e.g. via "Read More" on a related post),
 * so we subscribe to `route.paramMap` — rather than reading
 * `route.snapshot.paramMap` once in `ngOnInit` — to react to slug changes
 * on an already-mounted instance. `takeUntilDestroyed` (given an explicit
 * `DestroyRef` captured in a field initializer, since `ngOnInit` is not an
 * injection context) cleans the subscription up when the component is
 * actually destroyed.
 */
@Component({
  selector: 'app-marketing-blog-post',
  imports: [RouterLink, CtaBannerComponent],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.css'
})
export class BlogPostComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  post: BlogPost | undefined;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const slug = params.get('slug');
        this.post = BLOG_POSTS.find((p) => p.slug === slug);
        this.updateSeo();
      });
  }

  private updateSeo(): void {
    if (this.post) {
      this.seo.update({
        title: this.post.metaTitle,
        description: this.post.metaDescription,
        keywords: this.post.keywords,
      });
    } else {
      this.seo.update({
        title: 'Article Not Found',
        description: 'The requested blog post could not be found.',
      });
    }
  }
}
