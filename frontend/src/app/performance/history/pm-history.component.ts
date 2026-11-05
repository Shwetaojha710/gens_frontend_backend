import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Notyf } from 'notyf';
import { PerformanceService } from '../../services/performance.service';
import { MasterService } from '../../services/master.service';
import { cycleTypeLabel, fmtPct, fmtRating, potentialLabel, statusBadge } from '../performance-utils';
import { ExportColumn, exportExcel, exportPdf } from '../../shared/utils/table-export';

const HISTORY_COLUMNS: ExportColumn[] = [
  { header: 'Cycle', value: (r) => r.cycleName },
  { header: 'Type', value: (r) => cycleTypeLabel(r.cycleType) },
  { header: 'Period', value: (r) => `${r.cycleStart} to ${r.cycleEnd}` },
  { header: 'Status', value: (r) => r.statusLabel },
  { header: 'Goal Achievement', value: (r) => fmtPct(r.goalAchievement) },
  { header: 'Self', value: (r) => fmtRating(r.selfRating) },
  { header: 'Manager', value: (r) => fmtRating(r.managerRating) },
  { header: '360', value: (r) => fmtRating(r.feedbackRating) },
  { header: 'Final', value: (r) => fmtRating(r.finalRating) },
  { header: 'Rating', value: (r) => r.ratingLabel || '—' },
  { header: 'Potential', value: (r) => potentialLabel(r.potentialRating) },
  { header: 'Nine-Box', value: (r) => r.nineBox || '—' },
];

/** HR: one employee's performance across all cycles. */
@Component({
  selector: 'app-pm-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule, NgApexchartsModule],
  templateUrl: './pm-history.component.html',
})
export class PmHistoryComponent implements OnInit {
  private notyf = new Notyf();

  employeeOptions: { value: string; label: string }[] = [];
  employeeId: string | null = null;
  rows: any[] = [];
  loading = false;
  trendChart: any = null;

  readonly fmtPct = fmtPct;
  readonly fmtRating = fmtRating;
  readonly statusBadge = statusBadge;
  readonly cycleTypeLabel = cycleTypeLabel;

  constructor(private api: PerformanceService, private master: MasterService) {}

  ngOnInit(): void {
    this.master.getemployeeList().subscribe({
      next: (res: any) => {
        if (res?.status === true && Array.isArray(res.data)) {
          this.employeeOptions = res.data.filter((o: any) => o.value && o.value !== 'All');
        }
      },
    });
  }

  get employeeName(): string {
    return this.employeeOptions.find((o) => o.value === this.employeeId)?.label || '';
  }

  load(): void {
    this.rows = [];
    this.trendChart = null;
    if (!this.employeeId) return;
    this.loading = true;
    this.api.employeeHistory(this.employeeId).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Unable to load history');
          return;
        }
        this.rows = res.data;
        const scored = [...this.rows].reverse().filter((r) => r.finalRating !== null);
        this.trendChart = scored.length
          ? {
              series: [
                { name: 'Final rating', data: scored.map((r) => r.finalRating) },
                { name: 'Goal rating', data: scored.map((r) => r.goalRating) },
              ],
              chart: { type: 'line', height: 260, toolbar: { show: false } },
              xaxis: { categories: scored.map((r) => r.cycleName) },
              yaxis: { min: 0, max: 5, tickAmount: 5 },
              stroke: { curve: 'smooth', width: 3 },
              markers: { size: 5 },
            }
          : null;
      },
      error: () => (this.loading = false),
    });
  }

  export(kind: 'excel' | 'pdf'): void {
    const file = `Performance_History_${this.employeeName}`;
    const sheets = [{ name: 'History', columns: HISTORY_COLUMNS, rows: this.rows }];
    if (kind === 'excel') exportExcel(file, sheets);
    else exportPdf(file, `Performance History — ${this.employeeName}`, `${this.rows.length} cycle(s)`, sheets);
  }
}
