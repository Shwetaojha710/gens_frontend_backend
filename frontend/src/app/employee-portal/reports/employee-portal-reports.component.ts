import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { Notyf } from 'notyf';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EmployeePortalService } from '../services/employee-portal.service';

type EpLineOptions = Partial<{
  series: ApexAxisChartSeries;
  chart: ApexChart;
  stroke: ApexStroke;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  markers: ApexMarkers;
}>;

type EpPieOptions = Partial<{
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
}>;

type EpBarOptions = Partial<{
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  grid: ApexGrid;
  tooltip: ApexTooltip;
}>;

export type ReportInsightSeverity = 'positive' | 'neutral' | 'watch';

export interface ReportInsightCard {
  title: string;
  body: string;
  severity: ReportInsightSeverity;
  badge: string;
}

@Component({
  selector: 'app-employee-portal-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgApexchartsModule],
  templateUrl: './employee-portal-reports.component.html',
  styleUrl: './employee-portal-reports.component.css',
})
export class EmployeePortalReportsComponent implements OnInit {
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  loading = false;

  attendanceRows: Record<string, unknown>[] = [];
  leaveRows: unknown[] = [];
  billStatus: 'idle' | 'ok' | 'none' = 'idle';
  netPay = '—';
  earnings: { name?: string; finalAmount?: string | number }[] = [];
  deductions: { name?: string; finalAmount?: string | number }[] = [];

  attendanceTrendOptions: EpLineOptions = {};
  salaryPieOptions: EpPieOptions = {};
  performanceBarOptions: EpBarOptions = {};
  insightCards: ReportInsightCard[] = [];

  readonly months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  readonly monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  private notyf = new Notyf();

  constructor(private api: EmployeePortalService) {}

  ngOnInit(): void {
    this.load();
  }

  get periodLabel(): string {
    return `${this.monthNames[(this.month || 1) - 1]} ${this.year}`;
  }

  load(): void {
    this.loading = true;
    this.billStatus = 'idle';

    forkJoin({
      att: this.api.getMonthlyAttendance(this.month, this.year).pipe(
        catchError((e: Error) => {
          this.notyf.error(e.message || 'Attendance summary failed.');
          return of(null);
        }),
      ),
      leaves: this.api.getAppliedLeaves(this.month, this.year).pipe(catchError(() => of({ status: false, data: [] }))),
      bill: this.api.getBillDetails(this.month, this.year).pipe(catchError(() => of({ status: false as const }))),
    }).subscribe({
      next: ({ att, leaves, bill }) => {
        if (att) {
          const r = att as { AttendanceList?: { data?: Record<string, unknown>[] }[] };
          this.attendanceRows = r.AttendanceList?.[0]?.data || [];
        } else {
          this.attendanceRows = [];
        }

        const data = leaves['data'];
        this.leaveRows = leaves['status'] === true && Array.isArray(data) ? data : [];

        this.earnings = [];
        this.deductions = [];

        if (bill.status === true && bill.data != null) {
          const d = bill.data as {
            EarningArr?: { name?: string; finalAmount?: string | number }[];
            DeductionArr?: { name?: string; finalAmount?: string | number }[];
            totalSalary?: Record<string, unknown>;
          };
          this.earnings = d.EarningArr || [];
          this.deductions = d.DeductionArr || [];
          const row = d.totalSalary || (d as Record<string, unknown>);
          const net = row?.['net_amount'] ?? row?.['netAmount'];
          this.netPay =
            net != null && net !== ''
              ? Number(net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '—';
          this.billStatus = 'ok';
        } else {
          this.netPay = '—';
          this.billStatus = 'none';
        }
        this.rebuildChartsAndInsights();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get leaveCount(): number {
    return this.leaveRows.length;
  }

  statusCategory(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('week off')) return 'weekOff';
    if (s.includes('holiday')) return 'holiday';
    if (s.includes('on leave') || s.includes('first half') || s.includes('second half')) return 'leave';
    if (s.includes('absent')) return 'absent';
    if (s.includes('half day')) return 'halfDay';
    if (s.includes('late')) return 'late';
    if (s.includes('on time')) return 'onTime';
    return 'other';
  }

  /** 0–100 score for line trend; null skips the point (non-working days). */
  private punctualityScore(cat: string): number | null {
    switch (cat) {
      case 'onTime':
        return 100;
      case 'late':
        return 58;
      case 'halfDay':
        return 45;
      case 'absent':
        return 12;
      case 'leave':
        return 62;
      case 'weekOff':
      case 'holiday':
        return null;
      default:
        return 50;
    }
  }

  get attendanceSummary(): {
    total: number;
    onTime: number;
    late: number;
    absent: number;
    onLeave: number;
  } {
    const acc = { onTime: 0, late: 0, absent: 0, leave: 0, other: 0 };
    for (const r of this.attendanceRows) {
      const cat = this.statusCategory(String(r['status'] ?? ''));
      if (cat === 'onTime') acc.onTime++;
      else if (cat === 'late') acc.late++;
      else if (cat === 'absent') acc.absent++;
      else if (cat === 'leave') acc.leave++;
      else acc.other++;
    }
    return {
      total: this.attendanceRows.length,
      onTime: acc.onTime,
      late: acc.late,
      absent: acc.absent,
      onLeave: acc.leave,
    };
  }

  private rebuildChartsAndInsights(): void {
    this.buildAttendanceTrend();
    this.buildSalaryPie();
    this.buildPerformanceBar();
    this.buildInsightCards();
  }

  private buildAttendanceTrend(): void {
    const sorted = [...this.attendanceRows].sort(
      (a, b) => new Date(String(a['date'])).getTime() - new Date(String(b['date'])).getTime(),
    );
    const categories: string[] = [];
    const data: number[] = [];
    for (const r of sorted) {
      const t = new Date(String(r['date'])).getTime();
      if (Number.isNaN(t)) continue;
      const cat = this.statusCategory(String(r['status'] ?? ''));
      const score = this.punctualityScore(cat);
      if (score === null) continue;
      categories.push(new Date(String(r['date'])).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      data.push(score);
    }

    if (categories.length === 0) {
      this.attendanceTrendOptions = {};
      return;
    }

    this.attendanceTrendOptions = {
      series: [{ name: 'Punctuality index', data }],
      chart: {
        type: 'line',
        height: 300,
        fontFamily: 'inherit',
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#005fa8'],
      dataLabels: { enabled: false },
      markers: { size: 4, strokeWidth: 2, strokeColors: '#fff' },
      xaxis: {
        categories,
        labels: { rotate: -40, rotateAlways: categories.length > 10, style: { colors: '#64748b', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 5,
        title: { text: 'Index (0–100)', style: { color: '#64748b', fontSize: '12px' } },
        labels: { style: { colors: '#64748b' } },
      },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4, padding: { left: 8, right: 12 } },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} · higher is better punctuality`,
        },
      },
    };
  }

  private capPieSlices(
    parts: { label: string; value: number }[],
    maxSlices: number,
  ): { labels: string[]; series: number[] } {
    if (parts.length <= maxSlices) {
      return {
        labels: parts.map((p) => p.label),
        series: parts.map((p) => p.value),
      };
    }
    const sorted = [...parts].sort((a, b) => b.value - a.value);
    const head = sorted.slice(0, maxSlices - 1);
    const rest = sorted.slice(maxSlices - 1);
    const otherSum = rest.reduce((s, p) => s + p.value, 0);
    head.push({ label: 'Other components', value: otherSum });
    return {
      labels: head.map((p) => p.label),
      series: head.map((p) => p.value),
    };
  }

  private buildSalaryPie(): void {
    const parts: { label: string; value: number }[] = [];
    for (const e of this.earnings) {
      const v = Math.abs(Number(e.finalAmount));
      if (v > 0) parts.push({ label: e.name?.trim() || 'Earning', value: v });
    }
    for (const d of this.deductions) {
      const v = Math.abs(Number(d.finalAmount));
      if (v > 0) parts.push({ label: `${d.name?.trim() || 'Deduction'} (ded.)`, value: v });
    }

    if (parts.length === 0) {
      this.salaryPieOptions = {};
      return;
    }

    const { labels, series } = this.capPieSlices(parts, 10);
    const palette = [
      '#005fa8',
      '#15803d',
      '#7c3aed',
      '#b45309',
      '#0d9488',
      '#be185d',
      '#4f46e5',
      '#ca8a04',
      '#64748b',
      '#dc2626',
    ];

    this.salaryPieOptions = {
      series,
      chart: {
        type: 'pie',
        height: 320,
        fontFamily: 'inherit',
        toolbar: { show: false },
      },
      labels,
      colors: labels.map((_, i) => palette[i % palette.length]),
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${Math.round(val)}%`,
        style: { fontSize: '11px', fontWeight: 600 },
      },
      legend: {
        position: 'bottom',
        fontSize: '12px',
        labels: { colors: ['#334155'] },
      },
      tooltip: {
        y: {
          formatter: (val: number) =>
            val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        },
      },
    };
  }

  private buildPerformanceBar(): void {
    const s = this.attendanceSummary;
    const denomTL = s.onTime + s.late;
    const timeliness = denomTL > 0 ? Math.round((100 * s.onTime) / denomTL) : s.onTime > 0 ? 100 : 0;
    const denomPres = s.onTime + s.late + s.absent;
    const presence = denomPres > 0 ? Math.round((100 * (s.onTime + s.late)) / denomPres) : 0;
    const denomStab = Math.max(1, s.total);
    const stability = Math.max(0, Math.min(100, Math.round(100 - (100 * s.absent) / denomStab - (100 * s.late) / (denomStab * 2))));

    this.performanceBarOptions = {
      series: [{ name: 'Score', data: [timeliness, presence, stability] }],
      chart: {
        type: 'bar',
        height: 300,
        fontFamily: 'inherit',
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '48%',
          distributed: true,
        },
      },
      colors: ['#15803d', '#005fa8', '#7c3aed'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val}%`,
        offsetY: -4,
        style: { fontSize: '12px', fontWeight: 700, colors: ['#0f172a'] },
      },
      xaxis: {
        categories: ['Timeliness', 'Presence', 'Stability'],
        labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        max: 100,
        min: 0,
        tickAmount: 5,
        title: { text: 'Score %', style: { color: '#64748b', fontSize: '12px' } },
        labels: { style: { colors: '#64748b' } },
      },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4, padding: { left: 8, right: 8 } },
      tooltip: {
        y: {
          formatter: (val: number) => `${val}% (derived from this month’s attendance)`,
        },
      },
    };
  }

  private buildInsightCards(): void {
    const s = this.attendanceSummary;
    const leaves = this.leaveCount;
    const workingLike = s.onTime + s.late + s.absent + s.onLeave;
    const lateRatio = workingLike > 0 ? s.late / workingLike : 0;

    const anomaly: ReportInsightCard = (() => {
      if (s.total === 0) {
        return {
          title: 'Attendance anomaly detection',
          body: 'No attendance rows for this period — run detection after data is posted.',
          severity: 'neutral',
          badge: 'No data',
        };
      }
      const flags: string[] = [];
      if (s.absent >= 2) flags.push(`${s.absent} absent day(s)`);
      if (s.late >= 5) flags.push(`${s.late} late mark(s)`);
      if (lateRatio > 0.25 && s.late >= 2) flags.push('late rate above 25% of logged days');
      if (flags.length === 0) {
        return {
          title: 'Attendance anomaly detection',
          body: 'No strong anomalies vs. your month pattern. Keep steady check-ins.',
          severity: 'positive',
          badge: 'Stable',
        };
      }
      return {
        title: 'Attendance anomaly detection',
        body: `Patterns to review: ${flags.join('; ')}. Consider regularization if any day is incorrect.`,
        severity: 'watch',
        badge: 'Review',
      };
    })();

    const forecast: ReportInsightCard = (() => {
      if (s.total < 3) {
        return {
          title: 'Performance forecasting',
          body: 'Need a few more logged days this month to project a reliable rhythm.',
          severity: 'neutral',
          badge: 'Early',
        };
      }
      const onTimePct = workingLike > 0 ? Math.round((100 * s.onTime) / workingLike) : 0;
      return {
        title: 'Performance forecasting',
        body: `Simple projection: if the same mix continues, month-end punctuality lands near ${onTimePct}% of working-like days. Official reviews use HR policy and manager input.`,
        severity: 'neutral',
        badge: 'Heuristic',
      };
    })();

    const behavior: ReportInsightCard = (() => {
      if (s.total === 0) {
        return {
          title: 'Employee behaviour insights',
          body: 'No behaviour signals for this month yet.',
          severity: 'neutral',
          badge: '—',
        };
      }
      const dominant =
        s.onTime >= s.late && s.onTime >= s.absent
          ? 'mostly on-time arrivals'
          : s.late >= s.absent
            ? 'frequent late arrivals relative to absences'
            : 'absences stand out vs. late marks';
      return {
        title: 'Employee behaviour insights',
        body: `This month’s attendance shape: ${dominant}. Pair with leave history (${leaves} application(s)) for a fuller picture.`,
        severity: 'neutral',
        badge: 'Summary',
      };
    })();

    const burnout: ReportInsightCard = (() => {
      const stressScore = s.late + s.absent * 2 + leaves;
      let severity: ReportInsightSeverity = 'positive';
      let badge = 'OK';
      let body =
        'No burnout risk flags from attendance + leave volume alone. Well-being depends on workload and context — reach out if you feel stretched.';
      if (stressScore >= 8) {
        severity = 'watch';
        badge = 'Elevated';
        body =
          'Higher combined late marks, absences, and leave applications this month. Consider recovery time and discuss workload with your manager if this feels sustained.';
      } else if (stressScore >= 4) {
        severity = 'neutral';
        badge = 'Monitor';
        body =
          'Moderate signals from attendance and leave volume. Small resets (breaks, planning) often help before patterns harden.';
      }
      return {
        title: 'Burnout detection report',
        body,
        severity,
        badge,
      };
    })();

    const lateRisk: ReportInsightCard = (() => {
      if (s.total === 0) {
        return {
          title: 'Late risk prediction',
          body: 'Not enough attendance history for this month.',
          severity: 'neutral',
          badge: 'N/A',
        };
      }
      let risk: 'Low' | 'Medium' | 'High' = 'Low';
      let severity: ReportInsightSeverity = 'positive';
      if (s.late >= 6 || lateRatio > 0.35) {
        risk = 'High';
        severity = 'watch';
      } else if (s.late >= 3 || lateRatio > 0.2) {
        risk = 'Medium';
        severity = 'neutral';
      }
      return {
        title: 'Late risk prediction',
        body: `Estimated late risk for the rest of the month: ${risk}, based on late count (${s.late}) vs. logged days. Not a guarantee — use alarms and buffer time if risk is medium or high.`,
        severity,
        badge: risk,
      };
    })();

    const leaveRisk: ReportInsightCard = (() => {
      let risk: 'Low' | 'Medium' | 'High' = 'Low';
      let severity: ReportInsightSeverity = 'positive';
      if (leaves >= 5) {
        risk = 'High';
        severity = 'watch';
      } else if (leaves >= 2) {
        risk = 'Medium';
        severity = 'neutral';
      }
      return {
        title: 'Leave risk prediction',
        body: `Leave application load this month: ${leaves}. Estimated scheduling/clash risk: ${risk}. Plan handovers early if you expect more time off.`,
        severity,
        badge: risk,
      };
    })();

    this.insightCards = [anomaly, forecast, behavior, burnout, lateRisk, leaveRisk];
  }

  insightCardClass(card: ReportInsightCard): string {
    const base = 'ep-reports__insight';
    if (card.severity === 'positive') return `${base} ${base}--positive`;
    if (card.severity === 'watch') return `${base} ${base}--watch`;
    return `${base} ${base}--neutral`;
  }
}
