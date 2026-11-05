import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Notyf } from 'notyf';
import { PerformanceService } from '../../services/performance.service';
import { MasterService } from '../../services/master.service';
import { PmNineBoxComponent } from '../nine-box/pm-nine-box.component';
import { REVIEW_STATUSES, cycleTypeLabel, fmtPct, fmtRating } from '../performance-utils';
import { DEPARTMENT_EXPORT_COLUMNS, REVIEW_EXPORT_COLUMNS } from '../performance-export';
import { exportExcel, exportPdf } from '../../shared/utils/table-export';

/** HR / management: cycle KPIs, rating distribution, department analytics and the nine-box grid. */
@Component({
  selector: 'app-pm-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule, NgApexchartsModule, PmNineBoxComponent],
  templateUrl: './pm-dashboard.component.html',
})
export class PmDashboardComponent implements OnInit {
  private notyf = new Notyf();

  cycles: any[] = [];
  cycleId: string | null = null;
  departmentId: string | null = null;
  departmentOptions: { value: string; label: string }[] = [];
  data: any = null;
  loading = false;
  exporting = false;

  statusChart: any = null;
  distributionChart: any = null;
  departmentChart: any = null;

  readonly fmtPct = fmtPct;
  readonly fmtRating = fmtRating;
  readonly cycleTypeLabel = cycleTypeLabel;

  constructor(
    private api: PerformanceService,
    private master: MasterService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.master.Departmentsdd({}).subscribe({
      next: (res: any) => {
        if (res?.status === true && Array.isArray(res.data)) this.departmentOptions = res.data;
      },
    });
    this.api.listCycles().subscribe({
      next: (res: any) => {
        this.cycles = (res?.status === true ? res.data : []).filter((c: any) => c.status !== 'draft');
        const fromQuery = this.route.snapshot.queryParamMap.get('cycleId');
        this.cycleId =
          (fromQuery && this.cycles.some((c) => c.id === fromQuery) ? fromQuery : null) ||
          this.cycles.find((c) => c.status === 'active')?.id ||
          this.cycles[0]?.id ||
          null;
        this.load();
      },
    });
  }

  load(): void {
    if (!this.cycleId) return;
    this.loading = true;
    this.router.navigate([], { queryParams: { cycleId: this.cycleId }, replaceUrl: true });
    this.api.dashboard({ cycleId: this.cycleId, departmentId: this.departmentId }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Unable to load dashboard');
          return;
        }
        this.data = res.data;
        this.buildCharts();
      },
      error: () => (this.loading = false),
    });
  }

  private buildCharts(): void {
    const d = this.data;
    this.statusChart = {
      series: REVIEW_STATUSES.map((s) => d.statusCounts[s.value] || 0),
      chart: { type: 'donut', height: 260 },
      labels: REVIEW_STATUSES.map((s) => s.label),
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
    };
    this.distributionChart = {
      series: [{ name: 'Employees', data: d.distribution.map((x: any) => x.count) }],
      chart: { type: 'bar', height: 260, toolbar: { show: false } },
      xaxis: { categories: d.distribution.map((x: any) => x.label) },
      plotOptions: { bar: { borderRadius: 4, distributed: true } },
      colors: ['#28c76f', '#7367f0', '#00bad1', '#ff9f43', '#ff4c51'],
      legend: { show: false },
      dataLabels: { enabled: true },
    };
    const depts = d.departments.filter((x: any) => x.avgFinalRating !== null);
    this.departmentChart = {
      series: [
        { name: 'Avg final rating', data: depts.map((x: any) => x.avgFinalRating) },
        { name: 'Avg manager rating', data: depts.map((x: any) => x.avgManagerRating ?? 0) },
      ],
      chart: { type: 'bar', height: Math.max(220, depts.length * 48), toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
      xaxis: { categories: depts.map((x: any) => x.department), max: 5 },
      dataLabels: { enabled: false },
      legend: { position: 'top' },
    };
  }

  openReview(reviewId: string): void {
    this.router.navigate(['/layout/performance/review', reviewId]);
  }

  /** Pulls the full row set (not just the dashboard aggregates) and exports it. */
  export(kind: 'excel' | 'pdf'): void {
    if (!this.cycleId) return;
    this.exporting = true;
    this.api.report({ cycleId: this.cycleId, departmentId: this.departmentId }).subscribe({
      next: (res: any) => {
        this.exporting = false;
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Export failed');
          return;
        }
        const { cycle, rows, summary } = res.data;
        const sheets = [
          { name: 'Employee ratings', columns: REVIEW_EXPORT_COLUMNS, rows },
          { name: 'Department analytics', columns: DEPARTMENT_EXPORT_COLUMNS, rows: summary.departments },
        ];
        const file = `Performance_${cycle.name}`;
        if (kind === 'excel') exportExcel(file, sheets);
        else
          exportPdf(
            file,
            `Performance Report — ${cycle.name}`,
            `${summary.totalEmployees} employees · ${summary.completionRate}% approved · average final rating ${fmtRating(summary.avgFinalRating)}`,
            sheets,
          );
      },
      error: () => {
        this.exporting = false;
        this.notyf.error('Export failed');
      },
    });
  }
}
