import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MarketingThemeService } from '../../../services/marketing-theme.service';
import { NAV_LINKS } from '../../../data/site-data';

@Component({
  selector: 'app-marketing-header',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  readonly navLinks = NAV_LINKS;
  readonly scrolled = signal(false);
  readonly mobileOpen = signal(false);

  constructor(readonly themeService: MarketingThemeService) {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 20);
  }

  closeMobileMenu(): void {
    this.mobileOpen.set(false);
  }
}
