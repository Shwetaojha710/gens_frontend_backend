import { Component, ElementRef, HostListener, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { EmployeePortalService } from './services/employee-portal.service';
import { EmployeePortalNotificationReadService } from './services/employee-portal-notification-read.service';

interface LeaveNotificationItem {
  id: string;
  status: string;
  leaveType: string;
  employeeName: string;
  createdBy: string;
  approvedBy: string;
  recommendedBy: string;
  fromDate: string;
  toDate: string;
  days: string;
  reason: string;
  updatedAt: string;
}

interface LeaveStatusGroup {
  status: string;
  label: string;
  items: LeaveNotificationItem[];
}

@Component({
  selector: 'app-employee-portal-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './employee-portal-layout.component.html',
  styleUrl: './employee-portal-layout.component.css',
})
export class EmployeePortalLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('userMenuRef') userMenuRef?: ElementRef<HTMLElement>;
  @ViewChild('notifMenuRef') notifMenuRef?: ElementRef<HTMLElement>;

  userName = '';
  sidebarCollapsed = false;
  sidebarMobileOpen = false;
  userMenuOpen = false;

  private routerSub = new Subscription();
  private readSub = new Subscription();

  /** Notification bell */
  notifMenuOpen = false;
  notifLoading = false;
  notificationCount = 0;
  leaveNotifications: LeaveNotificationItem[] = [];
  leaveStatusGroups: LeaveStatusGroup[] = [];

  readonly leaveStatusOrder = [
    'pending',
    'recommended',
    'approved',
    'rejected',
    'self_declined',
  ] as const;

  private readonly leaveStatusSet = new Set<string>([
    ...this.leaveStatusOrder,
    'escalate',
  ]);

  constructor(
    private empApi: EmployeePortalService,
    private notifRead: EmployeePortalNotificationReadService,
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
    this.readSub = this.notifRead.changed$.subscribe(() => this.refreshUnreadCount());
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (window.innerWidth < 992) {
          this.closeMobileSidebar();
        }
        this.refreshUnreadCount();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
    this.readSub.unsubscribe();
    document.body.style.overflow = '';
  }

  private loadNotificationSummary(): void {
    this.notifLoading = true;
    this.empApi.getNotifications().subscribe({
      next: (res) => {
        this.notifLoading = false;
        const raw = res.status === true && Array.isArray(res.data) ? res.data : [];
        this.leaveNotifications = raw
          .map((row) => this.normalizeLeaveNotification(row))
          .filter((row): row is LeaveNotificationItem => row != null);

        this.refreshUnreadCount();
        this.leaveStatusGroups = this.buildLeaveStatusGroups(
          this.leaveNotifications.filter((n) => this.notifRead.isUnread(n)),
        );
      },
      error: () => {
        this.notifLoading = false;
        this.leaveNotifications = [];
        this.leaveStatusGroups = [];
        this.notificationCount = 0;
      },
    });
  }

  private refreshUnreadCount(): void {
    this.notificationCount = this.notifRead.unreadCount(this.leaveNotifications);
    this.leaveStatusGroups = this.buildLeaveStatusGroups(
      this.leaveNotifications.filter((n) => this.notifRead.isUnread(n)),
    );
  }

  markItemRead(n: LeaveNotificationItem): void {
    this.notifRead.markRead([n]);
    this.closeNotifMenu();
  }

  markAllVisibleRead(): void {
    this.notifRead.markAllRead(this.leaveNotifications);
    this.closeNotifMenu();
  }

  private normalizeLeaveNotification(row: unknown): LeaveNotificationItem | null {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const status = String(r['status'] ?? '').toLowerCase();
    if (!this.leaveStatusSet.has(status)) return null;

    return {
      id: String(r['id'] ?? ''),
      status,
      leaveType: r['leaveType'] != null ? String(r['leaveType']) : 'Leave',
      employeeName:
        r['employeeName'] != null && String(r['employeeName']).trim()
          ? String(r['employeeName']).trim()
          : r['createdBy'] != null
            ? String(r['createdBy'])
            : 'Employee',
      createdBy: r['createdBy'] != null ? String(r['createdBy']) : '',
      approvedBy: r['approvedBy'] != null ? String(r['approvedBy']) : '',
      recommendedBy: r['recommendedBy'] != null ? String(r['recommendedBy']) : '',
      fromDate: r['fromDate'] != null ? String(r['fromDate']) : '',
      toDate: r['toDate'] != null ? String(r['toDate']) : '',
      days: r['days'] != null ? String(r['days']) : '',
      reason: r['reason'] != null ? String(r['reason']) : '',
      updatedAt: r['updatedAt'] != null ? String(r['updatedAt']) : '',
    };
  }

  private buildLeaveStatusGroups(items: LeaveNotificationItem[]): LeaveStatusGroup[] {
    const byStatus = new Map<string, LeaveNotificationItem[]>();
    for (const item of items) {
      const list = byStatus.get(item.status) ?? [];
      list.push(item);
      byStatus.set(item.status, list);
    }

    const groups: LeaveStatusGroup[] = [];
    for (const status of this.leaveStatusOrder) {
      const list = byStatus.get(status);
      if (list?.length) {
        groups.push({ status, label: this.statusLabel(status), items: list });
      }
    }
    // Any other leave statuses (e.g. escalate) not in the main order
    for (const [status, list] of byStatus) {
      if (!this.leaveStatusOrder.includes(status as (typeof this.leaveStatusOrder)[number]) && list.length) {
        groups.push({ status, label: this.statusLabel(status), items: list });
      }
    }
    return groups;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      recommended: 'Recommended',
      approved: 'Approved',
      rejected: 'Rejected',
      self_declined: 'Self Declined',
      escalate: 'Escalated',
    };
    return map[String(status).toLowerCase()] || status;
  }

  statusTone(status: string): string {
    const s = String(status).toLowerCase();
    if (s === 'approved') return 'ok';
    if (s === 'pending' || s === 'recommended' || s === 'escalate') return 'warn';
    if (s === 'rejected' || s === 'self_declined') return 'bad';
    return 'muted';
  }

  dateRange(n: LeaveNotificationItem): string {
    if (n.fromDate && n.toDate && n.fromDate !== n.toDate) {
      return `${n.fromDate} → ${n.toDate}`;
    }
    return n.fromDate || n.toDate || '';
  }

  actorHint(n: LeaveNotificationItem): string {
    if (n.approvedBy && n.recommendedBy) {
      return `Rec: ${n.recommendedBy} · App: ${n.approvedBy}`;
    }
    if (n.approvedBy) return `Approved by ${n.approvedBy}`;
    if (n.recommendedBy) return `Recommended by ${n.recommendedBy}`;
    return '';
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

  openMobileSidebar(): void {
    this.sidebarMobileOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeMobileSidebar(): void {
    this.sidebarMobileOpen = false;
    document.body.style.overflow = '';
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
