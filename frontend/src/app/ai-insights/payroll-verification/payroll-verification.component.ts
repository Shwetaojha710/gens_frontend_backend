import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { AiHrmsService } from '../../services/ai-hrms.service';
import { MasterService } from '../../services/master.service';
import { formatAiSummary } from '../format-ai-summary';

@Component({
  selector: 'app-payroll-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './payroll-verification.component.html',
  styleUrl: './payroll-verification.component.css',
})
export class PayrollVerificationComponent implements OnInit {
  private notyf = new Notyf();

  employeeOptions: { value: string; label: string }[] = [];
  monthOptions = [
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
  yearOptions: { value: number; label: string }[] = [];

  employeeId: string | null = null;
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  loading = false;
  result: any = null;

  constructor(
    private aiHrms: AiHrmsService,
    private master: MasterService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadYears();
  }

  private loadYears(): void {
    const currentYear = new Date().getFullYear();
    const years: { value: number; label: string }[] = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
      years.push({ value: y, label: String(y) });
    }
    this.yearOptions = years;
  }

  private loadEmployees(): void {
    this.master.getemployeeList().subscribe({
      next: (res: any) => {
        if (res?.status === true && Array.isArray(res.data)) {
          this.employeeOptions = res.data.map((item: any) => ({
             value: item.value,
            label: item.label,
          }));
        }
      },
      error: () => {},
    });
  }

  formatSummary(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(formatAiSummary(text));
  }

  severityBadgeClass(severity: string): string {
    if (severity === 'error') return 'bg-label-danger';
    if (severity === 'warning') return 'bg-label-warning';
    return 'bg-label-info';
  }

  severityTimelineClass(severity: string): string {
    if (severity === 'error') return 'ai-timeline__item--danger';
    if (severity === 'warning') return 'ai-timeline__item--warning';
    return 'ai-timeline__item--info';
  }

  severityIconClass(severity: string): string {
    if (severity === 'error') return 'ri-error-warning-line';
    if (severity === 'warning') return 'ri-alert-line';
    return 'ri-information-line';
  }

  componentBarWidth(amount: number): number {
    const components = this.result?.data?.components;
    if (!Array.isArray(components) || !components.length) return 0;
    const max = Math.max(...components.map((c: any) => Math.abs(c.amount) || 0), 1);
    return Math.min(100, (Math.abs(amount) / max) * 100);
  }

  run(): void {
    if (!this.employeeId || !this.year || !this.month) {
      this.notyf.error('Fill in employee, year and month');
      return;
    }
    this.loading = true;
    this.aiHrms.verifyPayroll({ employee_id: this.employeeId, year: this.year, month: this.month }).subscribe({
      next: (res: any) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.notyf.error(err?.error?.detail || 'Could not verify payroll');
      },
    });
  }
}
