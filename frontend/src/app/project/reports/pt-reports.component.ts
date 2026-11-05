import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Notyf } from 'notyf';
import { ProjectService } from '../../services/project.service';
import { MasterService } from '../../services/master.service';
import { exportExcel, exportPdf } from '../../shared/utils/table-export';
import {
  CLIENT_REPORT_COLUMNS,
  PROJECT_REPORT_COLUMNS,
  RECONCILIATION_COLUMNS,
  UTILIZATION_COLUMNS,
  WEEKDAYS,
  budgetTone,
  fmtHours,
  fmtMoney,
  fmtPct,
  isoDate,
} from '../project-utils';

type Tab = 'utilization' | 'projects' | 'clients' | 'reconciliation' | 'settings';

/** HR: utilization, project-wise, client-wise and attendance-reconciliation reports, plus timesheet settings. */
@Component({
  selector: 'app-pt-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule, NgApexchartsModule],
  templateUrl: './pt-reports.component.html',
})
export class PtReportsComponent implements OnInit {
  private notyf = new Notyf();

  tab: Tab = 'utilization';
  filters: any = { from: '', to: '', departmentId: null, clientId: null, approvedOnly: false, flaggedOnly: true };
  departmentOptions: any[] = [];
  clients: any[] = [];
  loading = false;

  utilization: any[] = [];
  projects: any[] = [];
  clientRows: any[] = [];
  reconciliation: any[] = [];
  settings: any = null;
  chart: any = null;

  readonly weekdays = WEEKDAYS;
  readonly fmtHours = fmtHours;
  readonly fmtMoney = fmtMoney;
  readonly fmtPct = fmtPct;
  readonly budgetTone = budgetTone;

  constructor(private api: ProjectService, private master: MasterService) {}

  ngOnInit(): void {
    const now = new Date();
    this.filters.from = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    this.filters.to = isoDate(now);
    this.master.Departmentsdd({}).subscribe((res: any) => (this.departmentOptions = res?.status === true ? res.data : []));
    this.api.listClients().subscribe((res: any) => (this.clients = res?.data || []));
    this.api.getSettings().subscribe((res: any) => (this.settings = res?.data || null));
    this.load();
  }

  setTab(tab: Tab): void {
    this.tab = tab;
    if (tab !== 'settings') this.load();
  }

  load(): void {
    const f = this.filters;
    const base = { from: f.from, to: f.to, approvedOnly: f.approvedOnly };
    const handle = (obs: any, assign: (d: any) => void) => {
      this.loading = true;
      this.chart = null;
      obs.subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status !== true) {
            this.notyf.error(res?.message || 'Unable to load report');
            return;
          }
          assign(res.data);
        },
        error: () => (this.loading = false),
      });
    };
    if (this.tab === 'utilization') {
      handle(this.api.utilization({ ...base, departmentId: f.departmentId }), (d) => {
        this.utilization = [...d.rows].sort((a, b) => (b.utilization ?? -1) - (a.utilization ?? -1));
        const top = this.utilization.slice(0, 20);
        this.chart = top.length
          ? {
              series: [
                { name: 'Billable %', data: top.map((r) => r.billableUtilization ?? 0) },
                { name: 'Non-billable %', data: top.map((r) => Math.max(0, (r.utilization ?? 0) - (r.billableUtilization ?? 0))) },
              ],
              chart: { type: 'bar', stacked: true, height: Math.max(220, top.length * 32), toolbar: { show: false } },
              plotOptions: { bar: { horizontal: true } },
              xaxis: { categories: top.map((r) => r.employeeName), max: 120 },
              colors: ['#28c76f', '#a8aaae'],
              dataLabels: { enabled: false },
            }
          : null;
      });
    } else if (this.tab === 'projects') {
      handle(this.api.projectReport({ ...base, clientId: f.clientId }), (d) => {
        this.projects = d.filter((p: any) => p.actualHours > 0 || p.status === 'active');
        const top = this.projects.slice(0, 15);
        this.chart = top.length
          ? {
              series: [
                { name: 'Estimated', data: top.map((p) => p.estimatedHours) },
                { name: 'Actual', data: top.map((p) => p.actualHours) },
              ],
              chart: { type: 'bar', height: 300, toolbar: { show: false } },
              xaxis: { categories: top.map((p) => p.code || p.name) },
              dataLabels: { enabled: false },
            }
          : null;
      });
    } else if (this.tab === 'clients') {
      handle(this.api.clientReport(base), (d) => (this.clientRows = d));
    } else if (this.tab === 'reconciliation') {
      handle(this.api.reconciliation({ from: f.from, to: f.to, departmentId: f.departmentId, flaggedOnly: f.flaggedOnly }), (d) => (this.reconciliation = d));
    }
  }

  get totals(): any {
    const u = this.utilization;
    const sum = (k: string) => u.reduce((s, r) => s + (r[k] || 0), 0);
    const cap = sum('capacityHours');
    return {
      capacity: cap,
      logged: sum('loggedHours'),
      billable: sum('billableHours'),
      utilization: cap ? (sum('loggedHours') / cap) * 100 : null,
      billableUtilization: cap ? (sum('billableHours') / cap) * 100 : null,
    };
  }

  export(kind: 'excel' | 'pdf'): void {
    const sheetFor: Record<string, any> = {
      utilization: { name: 'Utilization', columns: UTILIZATION_COLUMNS, rows: this.utilization },
      projects: { name: 'Projects', columns: PROJECT_REPORT_COLUMNS, rows: this.projects },
      clients: { name: 'Clients', columns: CLIENT_REPORT_COLUMNS, rows: this.clientRows },
      reconciliation: { name: 'Attendance reconciliation', columns: RECONCILIATION_COLUMNS, rows: this.reconciliation },
    };
    const sheet = sheetFor[this.tab];
    if (!sheet) return;
    const file = `${sheet.name.replace(/\s+/g, '_')}_${this.filters.from}_${this.filters.to}`;
    if (kind === 'excel') exportExcel(file, [sheet]);
    else exportPdf(file, `${sheet.name} report`, `${this.filters.from} to ${this.filters.to}`, [sheet]);
  }

  toggleDay(day: number, checked: boolean): void {
    const set = new Set<number>(this.settings.workingDays);
    checked ? set.add(day) : set.delete(day);
    this.settings.workingDays = [...set].sort();
  }

  saveSettings(): void {
    this.api.saveSettings(this.settings).subscribe((res: any) => {
      if (res?.status === true) {
        this.notyf.success(res.message);
        this.settings = res.data;
      } else this.notyf.error(res?.message || 'Unable to save');
    });
  }
}
