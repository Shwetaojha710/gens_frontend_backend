import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './superadmin-layout.component.html',
  styleUrl: './superadmin-layout.component.css',
})
export class SuperadminLayoutComponent {
  userEmail: string | null = null;
  pageTitle = 'Overview';
  /** Mobile / tablet drawer open */
  sidebarOpen = false;
  profileMenuOpen = false;

  constructor(private router: Router) {
    try {
      const u = JSON.parse(localStorage.getItem('superadminUser') || 'null');
      this.userEmail = u?.email || null;
    } catch {
      this.userEmail = null;
    }

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url || '';
        if (url.includes('/superadmin/plans')) this.pageTitle = 'Plan Management';
        else if (url.includes('/superadmin/landing')) this.pageTitle = 'Home page CMS';
        else if (url.includes('/superadmin/contact-inquiries')) this.pageTitle = 'Contact inquiries';
        else if (url.includes('/superadmin/users')) this.pageTitle = 'Users Management';
        else if (url.includes('/superadmin/companies/') && url.includes('/dashboard'))
          this.pageTitle = 'Company dashboard';
        else if (url.includes('/superadmin/companies')) this.pageTitle = 'Company Management';
        else this.pageTitle = 'Overview';
        this.closeSidebar();
        this.profileMenuOpen = false;
      });
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 992) {
      this.sidebarOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const t = ev.target as HTMLElement | null;
    if (t?.closest('.sa-profile')) {
      return;
    }
    this.profileMenuOpen = false;
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }
    if (this.sidebarOpen) {
      this.closeSidebar();
    }
    if (this.profileMenuOpen) {
      this.profileMenuOpen = false;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['superadmin/login']);
  }
}

