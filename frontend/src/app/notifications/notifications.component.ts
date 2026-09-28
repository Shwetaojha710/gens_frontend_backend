import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import { MasterService } from '../services/master.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private notyf = new Notyf();
  loading = false;
  activeTab: 'all' | 'unread' | 'read' = 'all';
  items: any[] = [];
  unreadCount = 0;

  constructor(
    private master: MasterService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get filteredItems(): any[] {
    if (this.activeTab === 'unread') return this.items.filter((n) => !n.read);
    if (this.activeTab === 'read') return this.items.filter((n) => n.read);
    return this.items;
  }

  get readCount(): number {
    return this.items.filter((n) => n.read).length;
  }

  selectTab(tab: 'all' | 'unread' | 'read'): void {
    this.activeTab = tab;
  }

  load(): void {
    this.loading = true;
    this.master.getHeaderNotifications({}).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status === true) {
          this.items = res.data?.items || [];
          this.unreadCount = res.data?.count ?? this.items.filter((n: any) => !n.read).length;
        } else if (res?.status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(res?.message || 'Failed to load notifications');
        }
      },
      error: (err) => {
        this.loading = false;
        this.notyf.error(err?.error?.message || 'Failed to load notifications');
      },
    });
  }

  openItem(n: any): void {
    if (!n.read) {
      this.markRead([n], false);
    }
    if (n.link) this.router.navigateByUrl(n.link);
  }

  markOneRead(n: any, event?: Event): void {
    event?.stopPropagation();
    if (n.read) return;
    this.markRead([n], true);
  }

  markAllRead(): void {
    this.master.markHeaderNotificationsRead({ markAll: true }).subscribe({
      next: (res: any) => {
        if (res?.status === true) {
          this.notyf.success(res.message || 'All marked as read');
          this.load();
        } else {
          this.notyf.error(res?.message || 'Could not mark as read');
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Could not mark as read'),
    });
  }

  private markRead(list: any[], reload: boolean): void {
    const items = list.map((n) => ({
      refType: n.refType,
      refId: n.refId,
      status: n.status,
      updatedAtSnapshot: n.updatedAtSnapshot,
    }));
    this.master.markHeaderNotificationsRead({ items }).subscribe({
      next: (res: any) => {
        if (res?.status === true) {
          if (reload) this.load();
          else {
            list.forEach((n) => (n.read = true));
            this.unreadCount = this.items.filter((x) => !x.read).length;
          }
        }
      },
      error: () => {},
    });
  }
}
