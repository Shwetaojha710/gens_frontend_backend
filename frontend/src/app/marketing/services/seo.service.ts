import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
}

/** Updates page title and meta tags for SEO on the marketing site */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly baseTitle = 'GENS.Ai – AI-Powered HRMS';

  update(config: SeoConfig): void {
    const fullTitle = config.title === 'Home'
      ? this.baseTitle
      : `${config.title} | ${this.baseTitle}`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: config.description });
    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
  }
}
