import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { ExpenseService } from '../../services/expense.service';
import { MasterService } from '../../services/master.service';
import { ClaimDecision, ExClaimDetailComponent } from '../claim-detail/ex-claim-detail.component';
import {
  APPROVAL_LEVELS,
  CLAIM_EXPORT_COLUMNS,
  CLAIM_STATUSES,
  ITEM_EXPORT_COLUMNS,
  PAYMENT_MODES,
  claimStatusBadge,
  claimStatusLabel,
  fmtMoney,
  levelLabel,
} from '../expense-utils';
import { exportExcel, exportPdf } from '../../shared/utils/table-export';

/** HR / finance: every claim (new and older reimbursements), decisions, payments and exports. */
@Component({
  selector: 'app-ex-claims',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ExClaimDetailComponent],
  templateUrl: './ex-claims.component.html',
})
export class ExClaimsComponent implements OnInit {
  private notyf = new Notyf();

  filters: any = { status: 'pending', categoryId: null, departmentId: null, employeeId: null, fromDate: '', toDate: '', flaggedOnly: false, pendingWith: '' };
  search = '';
  rows: any[] = [];
  loading = false;
  busy = false;
  selected = new Set<string>();

  categoryOptions: any[] = [];
  departmentOptions: any[] = [];
  employeeOptions: any[] = [];

  openId: string | null = null;
  detail: any = null;
  permissions: any = {};

  bulkPayment: any = null;

  readonly statuses = CLAIM_STATUSES;
  readonly levels = APPROVAL_LEVELS;
  readonly paymentModes = PAYMENT_MODES;
  readonly fmtMoney = fmtMoney;
  readonly statusLabel = claimStatusLabel;
  readonly statusBadge = claimStatusBadge;
  readonly levelLabel = levelLabel;

  constructor(private api: ExpenseService, private master: MasterService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.has('status')) this.filters.status = q.get('status') || '';
    this.api.listCategories().subscribe((res: any) => (this.categoryOptions = res?.data || []));
    this.master.Departmentsdd({}).subscribe((res: any) => (this.departmentOptions = res?.status === true ? res.data : []));
    this.master.getemployeeList().subscribe((res: any) => {
      this.employeeOptions = res?.status === true ? res.data.filter((o: any) => o.value && o.value !== 'All') : [];
    });
    this.load();
  }

  private body(): any {
    const f = this.filters;
    return {
      status: f.status || null,
      categoryId: f.categoryId,
      departmentId: f.departmentId,
      employeeId: f.employeeId,
      fromDate: f.fromDate || null,
      toDate: f.toDate || null,
      flaggedOnly: f.flaggedOnly,
      pendingWith: f.pendingWith || null,
    };
  }

  get filtered(): any[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter((r) =>
      [r.claimNo, r.employeeName, r.empCode, r.title, r.department].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }

  get payableIds(): string[] {
    return this.filtered.filter((r) => r.status === 'approved').map((r) => r.id);
  }

  get filteredTotal(): number {
    return this.filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
  }

  load(): void {
    this.loading = true;
    this.selected.clear();
    this.api.listClaims(this.body()).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.rows = res?.status === true ? res.data : [];
        if (res?.status !== true) this.notyf.error(res?.message || 'Unable to load claims');
      },
      error: () => (this.loading = false),
    });
  }

  toggle(id: string, checked: boolean): void {
    checked ? this.selected.add(id) : this.selected.delete(id);
  }

  toggleAll(checked: boolean): void {
    this.selected = new Set(checked ? this.payableIds : []);
  }

  open(id: string): void {
    this.openId = id;
    this.detail = null;
    this.api.claimDetail(id).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Unable to load claim');
        this.openId = null;
        return;
      }
      this.detail = res.data;
      this.permissions = res.data.permissions || {};
    });
  }

  close(): void {
    this.openId = null;
    this.detail = null;
  }

  private run(obs: any, after: () => void): void {
    this.busy = true;
    obs.subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          after();
        } else this.notyf.error(res?.message || 'Request failed');
      },
      error: () => {
        this.busy = false;
        this.notyf.error('Request failed');
      },
    });
  }

  onDecide(d: ClaimDecision): void {
    if (!this.openId) return;
    const id = this.openId;
    this.run(this.api.act(id, d.action, d.comments, d.override), () => {
      this.open(id);
      this.load();
    });
  }

  onPay(payment: any): void {
    if (!this.openId) return;
    const id = this.openId;
    this.run(this.api.markPaid({ ids: [id], ...payment }), () => {
      this.open(id);
      this.load();
    });
  }

  openBulkPay(): void {
    const now = new Date();
    this.bulkPayment = {
      paymentMode: 'bank_transfer',
      paymentReference: '',
      paidAt: now.toISOString().slice(0, 10),
      payrollMonth: now.getMonth() + 1,
      payrollYear: now.getFullYear(),
    };
  }

  get selectedTotal(): number {
    return this.rows.filter((r) => this.selected.has(r.id)).reduce((s, r) => s + Number(r.amount || 0), 0);
  }

  submitBulkPay(): void {
    this.run(this.api.markPaid({ ids: [...this.selected], ...this.bulkPayment }), () => {
      this.bulkPayment = null;
      this.load();
    });
  }

  export(kind: 'excel' | 'pdf'): void {
    this.api.report(this.body()).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Export failed');
        return;
      }
      const sheets = [
        { name: 'Claims', columns: CLAIM_EXPORT_COLUMNS, rows: res.data.claims },
        { name: 'Expense lines', columns: ITEM_EXPORT_COLUMNS, rows: res.data.items },
      ];
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === 'excel') exportExcel(`Expense_Claims_${stamp}`, sheets);
      else
        exportPdf(
          `Expense_Claims_${stamp}`,
          'Expense Claims',
          `${res.data.claims.length} claims · total ${fmtMoney(res.data.claims.reduce((s: number, r: any) => s + Number(r.amount), 0))}`,
          sheets,
        );
    });
  }
}
