import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';

export interface LeaveNotificationRow {
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
  appliedOn: string;
  createdAt: string;
  updatedAt: string;
  unread: boolean;
}

@Component({
  selector: 'app-employee-portal-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './employee-portal-notifications.component.html',
  styleUrl: './employee-portal-notifications.component.css',
})
export class EmployeePortalNotificationsComponent implements OnInit {
  loading = true;
  rows: LeaveNotificationRow[] = [];
  selectedStatus: string | null = null;
  activeTab: 'unread' | 'read' = 'read';
  private notyf = new Notyf();

  readonly statusFilters = [
    { value: null as string | null, label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'self_declined', label: 'Self Declined' },
  ];

  private readonly leaveStatusSet = new Set([
    'pending',
    'recommended',
    'approved',
    'rejected',
    'self_declined',
    'escalate',
  ]);

  constructor(private api: EmployeePortalService) {}

  ngOnInit(): void {
    this.load();
  }

  get unreadRows(): LeaveNotificationRow[] {
    return this.rows.filter((r) => r.unread);
  }

  get readRows(): LeaveNotificationRow[] {
    return this.rows.filter((r) => !r.unread);
  }

  get unreadCount(): number {
    return this.unreadRows.length;
  }

  get tabRows(): LeaveNotificationRow[] {
    return this.activeTab === 'unread' ? this.unreadRows : this.readRows;
  }

  get displayRows(): LeaveNotificationRow[] {
    if (!this.selectedStatus) return this.tabRows;
    return this.tabRows.filter((r) => r.status === this.selectedStatus);
  }

  selectTab(tab: 'unread' | 'read'): void {
    this.activeTab = tab;
    this.selectedStatus = null;
  }

  load(): void {
    this.loading = true;
    this.api.getNotifications().subscribe({
      next: (res) => {
        this.loading = false;
        const raw = res.status === true && Array.isArray(res.data) ? res.data : [];
        this.rows = raw
          .map((row) => this.normalize(row))
          .filter((row): row is LeaveNotificationRow => row != null);
      },
      error: (e: Error) => {
        this.loading = false;
        this.rows = [];
        this.notyf.error(e?.message || 'Could not load notifications');
      },
    });
  }

  markAllRead(): void {
    const unread = this.unreadRows;
    if (!unread.length) return;
    const items = unread.map((r) => ({
      id: r.id,
      status: r.status,
      updatedAt: r.updatedAt,
    }));
    this.api.markNotificationsRead(items).subscribe({
      next: () => {
        this.notyf.success('All notifications marked as read');
        this.activeTab = 'read';
        this.load();
      },
      error: (e: Error) => {
        this.notyf.error(e?.message || 'Could not mark as read');
      },
    });
  }

  markOneRead(n: LeaveNotificationRow): void {
    if (!n.unread) return;
    this.api
      .markNotificationsRead([{ id: n.id, status: n.status, updatedAt: n.updatedAt }])
      .subscribe({
        next: () => this.load(),
        error: (e: Error) => {
          this.notyf.error(e?.message || 'Could not mark as read');
        },
      });
  }

  private normalize(row: unknown): LeaveNotificationRow | null {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const status = String(r['status'] ?? '').toLowerCase();
    if (!this.leaveStatusSet.has(status)) return null;

    const employeeName =
      r['employeeName'] != null && String(r['employeeName']).trim()
        ? String(r['employeeName']).trim()
        : r['createdBy'] != null
          ? String(r['createdBy'])
          : 'Employee';

    return {
      id: String(r['id'] ?? ''),
      status,
      leaveType: r['leaveType'] != null ? String(r['leaveType']) : 'Leave',
      employeeName,
      createdBy: r['createdBy'] != null ? String(r['createdBy']) : '',
      approvedBy: r['approvedBy'] != null ? String(r['approvedBy']) : '',
      recommendedBy: r['recommendedBy'] != null ? String(r['recommendedBy']) : '',
      fromDate: r['fromDate'] != null ? String(r['fromDate']) : '',
      toDate: r['toDate'] != null ? String(r['toDate']) : '',
      days: r['days'] != null ? String(r['days']) : '',
      reason: r['reason'] != null ? String(r['reason']) : '',
      appliedOn: r['appliedOn'] != null ? String(r['appliedOn']) : '',
      createdAt: r['createdAt'] != null ? String(r['createdAt']) : '',
      updatedAt: r['updatedAt'] != null ? String(r['updatedAt']) : '',
      unread: r['isRead'] !== true,
    };
  }

  countFor(status: string | null): number {
    if (!status) return this.tabRows.length;
    return this.tabRows.filter((r) => r.status === status).length;
  }

  selectFilter(status: string | null): void {
    this.selectedStatus = status;
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

  dateRange(n: LeaveNotificationRow): string {
    if (n.fromDate && n.toDate && n.fromDate !== n.toDate) {
      return `${n.fromDate} → ${n.toDate}`;
    }
    return n.fromDate || n.toDate || '—';
  }
}
