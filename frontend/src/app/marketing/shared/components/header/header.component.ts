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
  readonly desktopOpen = signal<string | null>(null);
  readonly mobileSection = signal<string | null>(null);

  constructor(readonly themeService: MarketingThemeService) {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 20);
  }

  openDesktopMenu(key: string): void {
    this.desktopOpen.set(key);
  }

  closeDesktopMenu(): void {
    this.desktopOpen.set(null);
  }

  toggleDesktopMenu(key: string): void {
    this.desktopOpen.update((cur) => (cur === key ? null : key));
  }

  toggleMobileSection(key: string): void {
    this.mobileSection.update((cur) => (cur === key ? null : key));
  }

  closeMobileMenu(): void {
    this.mobileOpen.set(false);
    this.mobileSection.set(null);
  }
}
