import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MarketingThemeService } from '../services/marketing-theme.service';
import { AnimatedBrandBgComponent } from '../shared/components/effects/animated-brand-bg/animated-brand-bg.component';
import { HeaderComponent } from '../shared/components/header/header.component';
import { FooterComponent } from '../shared/components/footer/footer.component';
import { BackToTopComponent } from '../shared/components/back-to-top/back-to-top.component';
import { RobotBuddyComponent } from '../shared/components/effects/robot-buddy/robot-buddy.component';

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
  constructor(private readonly themeService: MarketingThemeService) {}

  get isDark(): boolean {
    return this.themeService.isDark();
  }
}
