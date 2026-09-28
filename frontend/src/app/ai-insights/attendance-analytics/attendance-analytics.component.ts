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
  selector: 'app-attendance-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './attendance-analytics.component.html',
  styleUrl: './attendance-analytics.component.css',
})
export class AttendanceAnalyticsComponent implements OnInit {
  private notyf = new Notyf();

  departmentOptions: { label: string; value: string }[] = [];

  fromDate = '';
  toDate = '';
  departmentId: string | null = null;
  loading = false;
  result: any = null;

  constructor(
    private aiHrms: AiHrmsService,
    private master: MasterService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.toDate = today.toISOString().slice(0, 10);
    this.fromDate = monthAgo.toISOString().slice(0, 10);

    this.loadDepartments();
    this.run();
  }

  private loadDepartments(): void {
    this.master.Departmentsdd({}).subscribe({
      next: (res: any) => {
        if (res?.status === true && Array.isArray(res.data)) {
          this.departmentOptions = res.data;
        }
      },
      error: () => {},
    });
  }

  formatSummary(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(formatAiSummary(text));
  }

  sortedDeptTrends(): any[] {
    const trends = this.result?.data?.department_trends;
    if (!Array.isArray(trends)) return [];
    return [...trends].sort((a, b) => (b.attendance_rate ?? 0) - (a.attendance_rate ?? 0));
  }

  rateTierClass(rate: number): string {
    if (rate >= 90) return 'ai-meter-fill--good';
    if (rate >= 75) return 'ai-meter-fill--warn';
    return 'ai-meter-fill--bad';
  }

  run(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loading = true;
    this.aiHrms
      .getAttendanceInsights({
        from_date: this.fromDate,
        to_date: this.toDate,
        department_id: this.departmentId || undefined,
      })
      .subscribe({
        next: (res: any) => {
          this.result = res;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.notyf.error(err?.error?.detail || 'Could not load attendance insights');
        },
      });
  }
}
