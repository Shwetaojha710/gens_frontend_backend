import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type NotifReadKeySource = {
  id: string;
  status: string;
  updatedAt?: string;
};

/**
 * Client-side read tracking for employee-portal leave notifications.
 * Keys are per user + leave id + status so a status change becomes unread again.
 */
@Injectable({ providedIn: 'root' })
export class EmployeePortalNotificationReadService {
  readonly changed$ = new Subject<void>();

  private storageKey(): string {
    let userId = 'anon';
    try {
      const raw = localStorage.getItem('empPortalUser');
      if (raw) {
        const u = JSON.parse(raw) as { id?: string };
        if (u?.id) userId = String(u.id);
      }
    } catch {
      /* ignore */
    }
    return `empPortalNotifRead:${userId}`;
  }

  signature(item: NotifReadKeySource): string {
    const id = String(item.id || '').trim();
    const status = String(item.status || '').toLowerCase().trim();
    const updated = String(item.updatedAt || '').trim();
    return updated ? `${id}|${status}|${updated}` : `${id}|${status}`;
  }

  private readSet(): Set<string> {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.map((x) => String(x)));
    } catch {
      return new Set();
    }
  }

  private writeSet(set: Set<string>): void {
    localStorage.setItem(this.storageKey(), JSON.stringify([...set]));
    this.changed$.next();
  }

  isRead(item: NotifReadKeySource): boolean {
    if (!item?.id) return true;
    return this.readSet().has(this.signature(item));
  }

  isUnread(item: NotifReadKeySource): boolean {
    return !this.isRead(item);
  }

  markRead(items: NotifReadKeySource[]): void {
    if (!items?.length) return;
    const set = this.readSet();
    let changed = false;
    for (const item of items) {
      if (!item?.id) continue;
      const sig = this.signature(item);
      if (!set.has(sig)) {
        set.add(sig);
        changed = true;
      }
    }
    if (changed) this.writeSet(set);
  }

  markAllRead(items: NotifReadKeySource[]): void {
    this.markRead(items);
  }

  unreadCount(items: NotifReadKeySource[]): number {
    return items.filter((i) => this.isUnread(i)).length;
  }
}
