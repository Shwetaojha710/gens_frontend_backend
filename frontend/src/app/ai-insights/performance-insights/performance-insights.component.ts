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
  selector: 'app-performance-insights',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './performance-insights.component.html',
  styleUrl: './performance-insights.component.css',
})
export class PerformanceInsightsComponent implements OnInit {
  private notyf = new Notyf();

  employeeOptions: { value: string; label: string }[] = [];

  employeeId: string | null = null;
  loading = false;
  result: any = null;

  constructor(
    private aiHrms: AiHrmsService,
    private master: MasterService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
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

  completionPct(): number {
    const tasks = this.result?.data?.tasks;
    if (!tasks?.total) return 0;
    return Math.round(((tasks.completed ?? 0) / tasks.total) * 100);
  }

  leaveStatusTimelineClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'ai-timeline__item--success';
    if (s === 'rejected') return 'ai-timeline__item--danger';
    if (s === 'pending') return 'ai-timeline__item--warning';
    return 'ai-timeline__item--info';
  }

  run(): void {
    if (!this.employeeId) {
      this.notyf.error('Select an employee first');
      return;
    }
    this.loading = true;
    this.aiHrms.getPerformanceInsights(this.employeeId).subscribe({
      next: (res: any) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.notyf.error(err?.error?.detail || 'Could not load performance insights');
      },
    });
  }
}
