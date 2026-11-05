import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Notyf } from 'notyf';
import { ExpenseService } from '../../services/expense.service';
import { MasterService } from '../../services/master.service';
import { CLAIM_EXPORT_COLUMNS, ITEM_EXPORT_COLUMNS, fmtMoney } from '../expense-utils';
import { ExportColumn, exportExcel, exportPdf } from '../../shared/utils/table-export';

const CATEGORY_COLUMNS: ExportColumn[] = [
  { header: 'Category', value: (r) => r.category },
  { header: 'Expenses', value: (r) => r.count },
  { header: 'Amount', value: (r) => r.amount },
];
const DEPARTMENT_COLUMNS: ExportColumn[] = [
  { header: 'Department', value: (r) => r.department },
  { header: 'Claims', value: (r) => r.count },
  { header: 'Amount', value: (r) => r.amount },
];
const SPENDER_COLUMNS: ExportColumn[] = [
  { header: 'Employee', value: (r) => r.employeeName },
  { header: 'Department', value: (r) => r.department },
  { header: 'Claims', value: (r) => r.count },
  { header: 'Amount', value: (r) => r.amount },
];

/** HR / finance: spend, approval backlog and payables. */
@Component({
  selector: 'app-ex-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule, NgApexchartsModule],
  templateUrl: './ex-dashboard.component.html',
})
export class ExDashboardComponent implements OnInit {
  private notyf = new Notyf();

  filters: any = { fromDate: '', toDate: '', departmentId: null };
  departmentOptions: any[] = [];
  data: any = null;
  loading = false;

  trendChart: any = null;
  categoryChart: any = null;
  departmentChart: any = null;

  readonly fmtMoney = fmtMoney;

  constructor(private api: ExpenseService, private master: MasterService) {}

  ngOnInit(): void {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    this.filters.fromDate = d.toISOString().slice(0, 10);
    this.master.Departmentsdd({}).subscribe((res: any) => (this.departmentOptions = res?.status === true ? res.data : []));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.dashboard(this.filters).subscribe({
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
    const rupees = { formatter: (v: number) => fmtMoney(v) };
    this.trendChart = {
      series: [{ name: 'Claimed', data: d.monthly.map((m: any) => m.amount) }],
      chart: { type: 'bar', height: 280, toolbar: { show: false } },
      xaxis: { categories: d.monthly.map((m: any) => m.month) },
      yaxis: { labels: rupees },
      dataLabels: { enabled: false },
      plotOptions: { bar: { borderRadius: 4 } },
      tooltip: { y: rupees },
    };
    this.categoryChart = d.byCategory.length
      ? {
          series: d.byCategory.map((c: any) => c.amount),
          chart: { type: 'donut', height: 280 },
          labels: d.byCategory.map((c: any) => c.category),
          legend: { position: 'bottom' },
          tooltip: { y: rupees },
        }
      : null;
    this.departmentChart = d.byDepartment.length
      ? {
          series: [{ name: 'Amount', data: d.byDepartment.map((x: any) => x.amount) }],
          chart: { type: 'bar', height: Math.max(200, d.byDepartment.length * 44), toolbar: { show: false } },
          plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
          xaxis: { categories: d.byDepartment.map((x: any) => x.department), labels: rupees },
          dataLabels: { enabled: false },
          tooltip: { y: rupees },
        }
      : null;
  }

  export(kind: 'excel' | 'pdf'): void {
    this.api.report(this.filters).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Export failed');
        return;
      }
      const s = res.data.summary;
      const sheets = [
        { name: 'By category', columns: CATEGORY_COLUMNS, rows: s.byCategory },
        { name: 'By department', columns: DEPARTMENT_COLUMNS, rows: s.byDepartment },
        { name: 'Top spenders', columns: SPENDER_COLUMNS, rows: s.topSpenders },
        { name: 'Claims', columns: CLAIM_EXPORT_COLUMNS, rows: res.data.claims },
        { name: 'Expense lines', columns: ITEM_EXPORT_COLUMNS, rows: res.data.items },
      ];
      const range = `${this.filters.fromDate || 'start'} to ${this.filters.toDate || 'today'}`;
      if (kind === 'excel') exportExcel(`Expense_Report_${range}`, sheets);
      else
        exportPdf(
          `Expense_Report_${range}`,
          'Expense Report',
          `${range} · spend ${fmtMoney(s.totalAmount)} · outstanding ${fmtMoney(s.outstandingPayable)} · ${s.totalClaims} claims`,
          sheets.slice(0, 4),
        );
    });
  }
}
