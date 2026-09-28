import { Routes } from '@angular/router';
import { MarketingShellComponent } from './marketing-shell/marketing-shell.component';

/** Public marketing site: shell (header/footer/effects) + pages, all lazy-loaded. */
export const marketingRoutes: Routes = [
  {
    path: '',
    component: MarketingShellComponent,
    children: [
      { path: 'Home', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
      {
        path: 'features',
        loadComponent: () => import('./pages/features/features.component').then((m) => m.FeaturesComponent),
      },
      {
        path: 'solutions',
        loadComponent: () => import('./pages/solutions/solutions.component').then((m) => m.SolutionsComponent),
      },
      {
        path: 'industries',
        loadComponent: () => import('./pages/industries/industries.component').then((m) => m.IndustriesComponent),
      },
      {
        path: 'pricing',
        loadComponent: () => import('./pages/pricing/pricing.component').then((m) => m.PricingComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
      },
      {
        path: 'contact',
        loadComponent: () => import('./pages/contact/contact.component').then((m) => m.ContactComponent),
      },
      {
        path: 'blog',
        loadComponent: () => import('./pages/blog/blog.component').then((m) => m.BlogComponent),
      },
      {
        path: 'blog/:slug',
        loadComponent: () => import('./pages/blog/blog-post/blog-post.component').then((m) => m.BlogPostComponent),
      },
      {
        path: 'careers',
        loadComponent: () => import('./pages/careers/careers.component').then((m) => m.CareersComponent),
      },
      {
        path: 'faqs',
        loadComponent: () => import('./pages/faqs/faqs.component').then((m) => m.FaqsComponent),
      },
      {
        path: 'terms',
        loadComponent: () => import('./pages/terms/terms.component').then((m) => m.TermsComponent),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./pages/marketing-privacy/marketing-privacy.component').then((m) => m.MarketingPrivacyComponent),
      },
    ],
  },
];
