import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EmployeePortalService } from './services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './employee-portal-layout.component.html',
  styleUrl: './employee-portal-layout.component.css',
})
export class EmployeePortalLayoutComponent implements OnInit {
  @ViewChild('userMenuRef') userMenuRef?: ElementRef<HTMLElement>;
  @ViewChild('notifMenuRef') notifMenuRef?: ElementRef<HTMLElement>;

  userName = '';
  sidebarCollapsed = false;
  userMenuOpen = false;

  /** Notification bell */
  notifMenuOpen = false;
  notifLoading = false;
  notificationCount = 0;
  notificationPreview = 'No new notifications.';

  constructor(
    private empApi: EmployeePortalService,
    private router: Router,
  ) {
    try {
      const raw = localStorage.getItem('empPortalUser');
      if (raw) {
        const u = JSON.parse(raw) as { firstName?: string; lastName?: string };
        this.userName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Employee';
      }
    } catch {
      this.userName = 'Employee';
    }
  }

  ngOnInit(): void {
    this.loadNotificationSummary();
  }

  private loadNotificationSummary(): void {
    this.notifLoading = true;
    this.empApi.getNotifications().subscribe({
      next: (res) => {
        this.notifLoading = false;
        if (res.status === true && res.data != null) {
          const d = res.data;
          if (Array.isArray(d)) {
            this.notificationCount = d.length;
            this.notificationPreview =
              d.length === 0
                ? 'You are all caught up.'
                : `${d.length} update(s) in your activity feed.`;
          } else {
            this.notificationCount = 1;
            this.notificationPreview = 'You have notifications to review.';
          }
        } else {
          this.notificationCount = 0;
          this.notificationPreview = 'No active notifications right now.';
        }
      },
      error: () => {
        this.notifLoading = false;
        this.notificationCount = 0;
        this.notificationPreview = 'Notifications could not be loaded.';
      },
    });
  }

  get userInitials(): string {
    const parts = this.userName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return (parts[0]?.charAt(0) || 'E').toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const t = event.target as Node;
    if (this.userMenuOpen) {
      const el = this.userMenuRef?.nativeElement;
      if (!el?.contains(t)) this.userMenuOpen = false;
    }
    if (this.notifMenuOpen) {
      const nel = this.notifMenuRef?.nativeElement;
      if (!nel?.contains(t)) this.notifMenuOpen = false;
    }
  }

  toggleUserMenu(ev: Event): void {
    ev.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) this.notifMenuOpen = false;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  toggleNotifMenu(ev: Event): void {
    ev.stopPropagation();
    this.notifMenuOpen = !this.notifMenuOpen;
    if (this.notifMenuOpen) this.userMenuOpen = false;
  }

  closeNotifMenu(): void {
    this.notifMenuOpen = false;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.closeUserMenu();
    this.empApi.logout().subscribe({
      next: () => undefined,
      error: () => undefined,
    });
    localStorage.removeItem('empPortalToken');
    localStorage.removeItem('empPortalBranchId');
    localStorage.removeItem('empPortalUser');
    localStorage.removeItem('empPortalTenant');
    localStorage.removeItem('empPortalCurrency');
    localStorage.removeItem('empPortalBaseUrl');
    void this.router.navigate(['/employee-portal/login']);
  }
}
