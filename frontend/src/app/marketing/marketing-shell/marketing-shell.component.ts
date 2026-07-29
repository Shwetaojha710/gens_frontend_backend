import { Component,inject, PLATFORM_ID  } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MarketingThemeService } from '../services/marketing-theme.service';
import { AnimatedBrandBgComponent } from '../shared/components/effects/animated-brand-bg/animated-brand-bg.component';
import { HeaderComponent } from '../shared/components/header/header.component';
import { FooterComponent } from '../shared/components/footer/footer.component';
import { BackToTopComponent } from '../shared/components/back-to-top/back-to-top.component';
import { RobotBuddyComponent } from '../shared/components/effects/robot-buddy/robot-buddy.component';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
/** Root shell for the marketing site: persistent header/footer/effects around a routed <router-outlet>. */
@Component({
  selector: 'app-marketing-shell',
  imports: [
    RouterOutlet,
    AnimatedBrandBgComponent,
    HeaderComponent,
    FooterComponent,
    BackToTopComponent,
    RobotBuddyComponent,
  ],
  templateUrl: './marketing-shell.component.html',
  styleUrl: './marketing-shell.component.css',
})
export class MarketingShellComponent {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private sub?: Subscription;
  constructor(private readonly themeService: MarketingThemeService) {}
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        window.scrollTo(0, 0);
        // next tick — DOM settle ke baad
        setTimeout(() => ScrollTrigger.refresh(), 50);
      });
  }
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
  get isDark(): boolean {
    return this.themeService.isDark();
  }
}
