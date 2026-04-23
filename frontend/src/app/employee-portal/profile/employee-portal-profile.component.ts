import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmployeePortalService } from '../services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './employee-portal-profile.component.html',
  styleUrl: './employee-portal-profile.component.css',
})
export class EmployeePortalProfileComponent implements OnInit {
  loading = true;
  profile: Record<string, unknown> | null = null;
  photoBroken = false;

  /** Portal shortcuts (same routes as sidebar) — styled like the reference icon grid. */
  readonly quickLinks: { label: string; path: string; icon: string }[] = [
    { label: 'Dashboard', path: '/employee-portal/dashboard', icon: 'ri-dashboard-3-line' },
    { label: 'Reports', path: '/employee-portal/reports', icon: 'ri-bar-chart-box-line' },
    { label: 'Attendance', path: '/employee-portal/attendance', icon: 'ri-calendar-line' },
    { label: 'Regularization', path: '/employee-portal/regularization', icon: 'ri-time-line' },
    { label: 'Leave', path: '/employee-portal/leave', icon: 'ri-calendar-event-line' },
    { label: 'Salary slip', path: '/employee-portal/salary', icon: 'ri-money-dollar-circle-line' },
    { label: 'Holidays', path: '/employee-portal/holidays', icon: 'ri-calendar-todo-line' },
    { label: 'My documents', path: '/employee-portal/documents', icon: 'ri-file-text-line' },
    { label: 'Reimbursement', path: '/employee-portal/reimbursement', icon: 'ri-refund-2-line' },
  ];

  constructor(private api: EmployeePortalService) {}

  ngOnInit(): void {
    this.api.getEmpDetails().subscribe({
      next: (data) => {
        this.photoBroken = false;
        this.profile = data as Record<string, unknown>;
        this.loading = false;
      },
      error: () => {
        this.profile = null;
        this.loading = false;
      },
    });
  }

  private fileBase(): string {
    const fromLs = localStorage.getItem('empPortalBaseUrl');
    if (fromLs?.trim()) {
      return fromLs.replace(/\/$/, '');
    }
    return environment.apiUrl.replace(/\/?api\/?$/i, '').replace(/\/$/, '');
  }

  get displayName(): string {
    const p = this.profile;
    if (p) {
      const n = [p['firstName'], p['lastName']].filter(Boolean).join(' ').trim();
      if (n) return n;
    }
    try {
      const u = JSON.parse(localStorage.getItem('empPortalUser') || '{}') as {
        firstName?: string;
        lastName?: string;
      };
      return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || 'Employee';
    } catch {
      return 'Employee';
    }
  }

  get displayInitials(): string {
    const name = this.displayName.trim();
    if (!name || name === 'Employee') return 'EP';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  get photoSrc(): string {
    const raw = this.profile?.['profileImage'];
    const path = raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
    if (!path) {
      return this.defaultAvatarPath();
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const base = this.fileBase();
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  defaultAvatarPath(): string {
    const g = String(this.profile?.['gender'] || '').toLowerCase();
    if (g === 'female') {
      return 'assets/img/avatars/2.png';
    }
    return 'assets/img/avatars/1.png';
  }

  get bankList(): Record<string, unknown>[] {
    const ba = this.profile?.['bank_account'];
    return Array.isArray(ba) ? ba : [];
  }

  /** Trimmed reporting manager or em dash. */
  reportingLine(): string {
    const s = this.line('reportingPersonName');
    if (s === '—') return '—';
    const t = s.trim();
    return t || '—';
  }

  /** Human-readable tenure from `joiningDate` when present. */
  get tenureLabel(): string {
    const p = this.profile;
    if (!p) return '—';
    const jd = p['joiningDate'];
    if (jd == null || jd === '') return '—';
    const d = new Date(String(jd));
    if (Number.isNaN(d.getTime())) return '—';
    const now = new Date();
    let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months -= 1;
    if (months < 0) return '—';
    const years = Math.floor(months / 12);
    const mo = months % 12;
    if (years === 0 && mo === 0) return 'New joiner';
    if (years === 0) return `${mo} mo`;
    if (mo === 0) return `${years} yr${years > 1 ? 's' : ''}`;
    return `${years} yr · ${mo} mo`;
  }

  get organisationBlurb(): string {
    const bits: string[] = [];
    const des = this.line('designation');
    const dep = this.line('department');
    const rep = this.reportingLine();
    if (des !== '—') bits.push(des);
    if (dep !== '—') bits.push(dep);
    if (rep !== '—') bits.push(`Reports to ${rep}`);
    return bits.length > 0 ? bits.join(' · ') : 'Organisation details will show here once HR completes your record.';
  }

  get complianceBlurb(): string {
    const parts: string[] = [];
    if (this.line('panNo') !== '—') parts.push('PAN on file');
    if (this.line('adhaarNo') !== '—') parts.push('Aadhaar on file');
    const n = this.bankList.length;
    if (n > 0) parts.push(`${n} bank account${n > 1 ? 's' : ''}`);
    return parts.length > 0
      ? parts.join(' · ')
      : 'Complete KYC and bank details with HR if anything is missing.';
  }

  get accountActive(): boolean {
    return String(this.profile?.['status'] || '').toLowerCase() === 'active';
  }

  line(key: string): string {
    const v = this.profile?.[key];
    if (v == null || v === '') return '—';
    return String(v);
  }

  lineFrom(row: Record<string, unknown>, key: string): string {
    const v = row[key];
    if (v == null || v === '') return '—';
    return String(v);
  }

  yn(key: string): string {
    const v = this.profile?.[key];
    if (v === true || v === 'true' || v === 1 || v === '1') return 'Yes';
    if (v === false || v === 'false' || v === 0 || v === '0') return 'No';
    if (v == null || v === '') return '—';
    return String(v);
  }

  onPhotoError(): void {
    this.photoBroken = true;
  }
}
