import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { environment } from '../../../environments/environment';
import { EmployeePortalService } from '../services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-salary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-portal-salary.component.html',
  styleUrl: './employee-portal-salary.component.css',
})
export class EmployeePortalSalaryComponent {
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  loading = false;
  printing = false;
  earnings: { name?: string; finalAmount?: string | number }[] = [];
  deductions: { name?: string; finalAmount?: string | number }[] = [];
  totalSalary: Record<string, unknown> | null = null;
  /** Shown in summary; excludes ids and raw JSON. */
  readonly payrollMeta: { key: string; label: string }[] = [
    { key: 'full_days', label: 'Full days' },
    { key: 'absent_days', label: 'Absent days' },
    { key: 'leave_taken', label: 'Leave taken' },
    { key: 'bill_date', label: 'Payroll date' },
  ];
  private notyf = new Notyf();

  constructor(private api: EmployeePortalService) {}

  /** Month labels for the period selector */
  readonly months: { value: number; label: string }[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  amountDisplay(val: unknown): string {
    if (val == null || val === '') return '—';
    const n = Number(val);
    if (Number.isNaN(n)) return String(val);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Net pay from bill row (API field `net_amount`). */
  netPayDisplay(): string {
    const row = this.totalSalary;
    if (!row) return '—';
    const raw = row['net_amount'] ?? row['netAmount'];
    return this.amountDisplay(raw);
  }

  metaValue(key: string): string {
    const row = this.totalSalary;
    if (!row) return '—';
    const v = row[key];
    if (v == null || v === '') return '—';
    if (key === 'bill_date') {
      const d = new Date(String(v));
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
    return String(v);
  }

  get hasPayrollData(): boolean {
    return this.totalSalary != null && Object.keys(this.totalSalary).length > 0;
  }

  /** True when no attendance/period fields are present for the meta block. */
  payrollMetaAllEmpty(): boolean {
    return this.payrollMeta.every((m) => this.metaValue(m.key) === '—');
  }

  load(): void {
    this.loading = true;
    this.earnings = [];
    this.deductions = [];
    this.totalSalary = null;
    this.api.getBillDetails(this.month, this.year).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status !== true || !res.data) {
          this.notyf.error(res.message || 'No salary data for this month.');
          return;
        }
        const d = res.data as {
          EarningArr?: { name?: string; finalAmount?: string | number }[];
          DeductionArr?: { name?: string; finalAmount?: string | number }[];
          totalSalary?: Record<string, unknown>;
        };
        this.earnings = d.EarningArr || [];
        this.deductions = d.DeductionArr || [];
        this.totalSalary = d.totalSalary || null;
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Could not load salary.');
      },
    });
  }

  print(): void {
    this.printing = true;
    this.api.printBill(this.month, this.year).subscribe({
      next: (res) => {
        this.printing = false;
        if (res.status !== true || !res.data?.downloadUrl) {
          this.notyf.error(res.message || 'Could not generate slip.');
          return;
        }
        let url = res.data.downloadUrl;
        if (!/^https?:\/\//i.test(url)) {
          const base = localStorage.getItem('empPortalBaseUrl') || environment.apiUrl.replace(/\/?api\/?$/i, '');
          url = `${String(base).replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`;
        }
        window.open(url, '_blank');
      },
      error: () => {
        this.printing = false;
        this.notyf.error('Print failed.');
      },
    });
  }
}
