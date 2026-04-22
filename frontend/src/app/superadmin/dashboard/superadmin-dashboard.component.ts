import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrl: './superadmin-dashboard.component.css',
})
export class SuperadminDashboardComponent implements OnInit {
  notyf = new Notyf();
  loading = false;
  stats = {
    totalCompanies: 0,
    totalPlans: 0,
    totalUsers: 0,
  };
  analytics = {
    companies: { active: 0, inactive: 0, total: 0 },
    users: { active: 0, inactive: 0, total: 0 },
    planDistribution: [] as Array<{ plan: string; count: number }>,
    expiringNext30Days: [] as Array<any>,
    companySignupsLast30Days: [] as Array<{ date: string; count: number }>,
    usersByRole: [] as Array<{ role: string; count: number }>,
  };

  constructor(private api: SuperadminService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.api.getStats().subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (data.status && data.data) {
          this.stats = {
            totalCompanies: Number(data.data.totalCompanies || 0),
            totalPlans: Number(data.data.totalPlans || 0),
            totalUsers: Number(data.data.totalUsers || 0),
          };
        }
      },
    });
    this.api.getAnalytics().subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (data.status && data.data) {
          this.analytics = data.data;
        }
      },
      error: () => this.notyf.error('Server error while loading analytics.'),
      complete: () => (this.loading = false),
    });
  }

  // --- Charts helpers (no external libs) ---
  get pieSegments(): Array<{ label: string; count: number; color: string; dashArray: string; dashOffset: number }> {
    const items = (this.analytics.planDistribution || []).slice(0, 6);
    const total = items.reduce((s, x) => s + Number(x.count || 0), 0);
    const colors = ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b", "#fb7185", "#94a3b8"];
    const circumference = 2 * Math.PI * 16;

    let offset = 0;
    return items.map((x, idx) => {
      const frac = total ? Number(x.count || 0) / total : 0;
      const len = frac * circumference;
      const seg = {
        label: x.plan,
        count: Number(x.count || 0),
        color: colors[idx % colors.length],
        dashArray: `${len} ${circumference - len}`,
        dashOffset: -offset,
      };
      offset += len;
      return seg;
    });
  }

  get linePoints(): string {
    const series = this.analytics.companySignupsLast30Days || [];
    if (!series.length) return '';
    const w = 320;
    const h = 120;
    const pad = 10;
    const max = Math.max(...series.map((d) => Number(d.count || 0)), 1);
    const step = (w - pad * 2) / (series.length - 1);
    return series
      .map((d, i) => {
        const x = pad + i * step;
        const y = pad + (h - pad * 2) * (1 - Number(d.count || 0) / max);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  get barMax(): number {
    const arr = this.analytics.usersByRole || [];
    return Math.max(...arr.map((x) => Number(x.count || 0)), 1);
  }
}

