import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { ExpenseService } from '../../services/expense.service';
import { ClaimDecision, ExClaimDetailComponent } from '../../expense/claim-detail/ex-claim-detail.component';
import { claimStatusBadge, claimStatusLabel, fmtMoney, levelLabel } from '../../expense/expense-utils';

type Tab = 'claims' | 'new' | 'approvals' | 'payables';

interface DraftItem {
  categoryId: string | null;
  expenseDate: string;
  amount: number | null;
  merchant: string;
  invoiceNo: string;
  description: string;
  receipt: { id: string; fileName: string; ocrStatus: string; extracted: any; alreadyClaimed: boolean } | null;
  uploading: boolean;
  /** Fields OCR filled in, so the employee knows to double-check them. */
  ocrFilled: string[];
}

/**
 * Employee portal: expense claims with receipt OCR, plus the approval queue for
 * managers / skip-level managers / finance and payment recording for finance.
 * Replaces the older single-amount reimbursement form; older claims still show here.
 */
@Component({
  selector: 'app-employee-portal-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ExClaimDetailComponent],
  templateUrl: './employee-portal-expenses.component.html',
  styleUrl: './employee-portal-expenses.component.css',
})
export class EmployeePortalExpensesComponent implements OnInit, OnDestroy {
  private notyf = new Notyf();
  private validateTimer: any = null;

  tab: Tab = 'claims';
  categories: any[] = [];
  claims: any[] = [];
  approvals: any[] = [];
  payables: any[] = [];
  isFinance = false;
  loading = false;
  busy = false;

  draft = { title: '', description: '', items: [] as DraftItem[] };
  check: { errors: any[]; items: { flags: any[] }[]; approvalLevels: any[] } | null = null;

  openId: string | null = null;
  detail: any = null;
  permissions: any = {};

  selectedPayables = new Set<string>();
  bulkPayment: any = null;

  readonly fmtMoney = fmtMoney;
  readonly statusLabel = claimStatusLabel;
  readonly statusBadge = claimStatusBadge;
  readonly levelLabel = levelLabel;

  constructor(private api: ExpenseService) {}

  ngOnInit(): void {
    this.api.myCategories().subscribe((res: any) => (this.categories = res?.data || []));
    this.loadClaims();
    this.loadApprovals();
    this.resetDraft();
  }

  ngOnDestroy(): void {
    clearTimeout(this.validateTimer);
  }

  loadClaims(): void {
    this.loading = true;
    this.api.myClaims().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.claims = res?.data || [];
      },
      error: () => (this.loading = false),
    });
  }

  loadApprovals(): void {
    this.api.myApprovals().subscribe((res: any) => {
      this.approvals = res?.data?.rows || [];
      this.isFinance = !!res?.data?.isFinance;
      if (this.isFinance) this.loadPayables();
    });
  }

  loadPayables(): void {
    this.selectedPayables.clear();
    this.api.payables().subscribe((res: any) => (this.payables = res?.status === true ? res.data : []));
  }

  // ── New claim ──

  private blankItem(): DraftItem {
    return {
      categoryId: null,
      expenseDate: new Date().toISOString().slice(0, 10),
      amount: null,
      merchant: '',
      invoiceNo: '',
      description: '',
      receipt: null,
      uploading: false,
      ocrFilled: [],
    };
  }

  resetDraft(): void {
    this.draft = { title: '', description: '', items: [this.blankItem()] };
    this.check = null;
  }

  addItem(): void {
    this.draft.items.push(this.blankItem());
  }

  removeItem(i: number): void {
    this.draft.items.splice(i, 1);
    this.scheduleValidate();
  }

  category(id: string | null): any {
    return this.categories.find((c) => c.id === id);
  }

  /** Short policy summary under the category picker. */
  policyHint(id: string | null): string {
    const c = this.category(id);
    if (!c) return '';
    const parts: string[] = [];
    if (c.perClaimLimit !== null) parts.push(`max ${fmtMoney(c.perClaimLimit)} per expense`);
    if (c.monthlyLimit !== null) parts.push(`${fmtMoney(c.monthlyLimit)} per month`);
    parts.push(+c.receiptRequiredAbove > 0 ? `receipt above ${fmtMoney(c.receiptRequiredAbove)}` : 'receipt required');
    if (c.maxAgeDays) parts.push(`claim within ${c.maxAgeDays} days`);
    return parts.join(' · ');
  }

  get draftTotal(): number {
    return this.draft.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  }

  itemErrors(index: number): string[] {
    return (this.check?.errors || []).filter((e) => e.index === index).map((e) => e.message);
  }

  itemFlags(index: number): any[] {
    return this.check?.items?.[index]?.flags || [];
  }

  onReceiptSelected(item: DraftItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    item.uploading = true;
    this.api.uploadReceipt(file).subscribe({
      next: (res: any) => {
        item.uploading = false;
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Upload failed');
          return;
        }
        item.receipt = res.data;
        item.ocrFilled = [];
        const x = res.data.extracted || {};
        // Only fill blanks; never overwrite what the employee typed
        if (x.amount && !item.amount) { item.amount = x.amount; item.ocrFilled.push('amount'); }
        // The date starts as today, so treat that as "not chosen yet"
        if (x.date && item.expenseDate === new Date().toISOString().slice(0, 10)) { item.expenseDate = x.date; item.ocrFilled.push('date'); }
        if (x.merchant && !item.merchant) { item.merchant = x.merchant; item.ocrFilled.push('merchant'); }
        if (x.invoiceNo && !item.invoiceNo) { item.invoiceNo = x.invoiceNo; item.ocrFilled.push('invoice no.'); }
        if (res.data.alreadyClaimed) this.notyf.error('This receipt has already been claimed');
        else if (item.ocrFilled.length) this.notyf.success(`Read from receipt: ${item.ocrFilled.join(', ')} — please check`);
        else this.notyf.success(res.message);
        this.scheduleValidate();
      },
      error: () => {
        item.uploading = false;
        this.notyf.error('Upload failed');
      },
    });
  }

  removeReceipt(item: DraftItem): void {
    item.receipt = null;
    item.ocrFilled = [];
    this.scheduleValidate();
  }

  private payloadItems(): any[] {
    return this.draft.items.map((i) => ({
      categoryId: i.categoryId,
      expenseDate: i.expenseDate,
      amount: i.amount,
      merchant: i.merchant,
      invoiceNo: i.invoiceNo,
      description: i.description,
      receiptId: i.receipt?.id || null,
    }));
  }

  /** Live policy check while the employee fills the form. */
  scheduleValidate(): void {
    clearTimeout(this.validateTimer);
    this.validateTimer = setTimeout(() => {
      if (!this.draft.items.some((i) => i.categoryId && i.amount)) return;
      this.api.validate(this.payloadItems()).subscribe((res: any) => {
        if (res?.status === true) this.check = res.data;
      });
    }, 500);
  }

  submit(): void {
    this.busy = true;
    this.api.submit({ title: this.draft.title, description: this.draft.description, items: this.payloadItems() }).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.resetDraft();
          this.tab = 'claims';
          this.loadClaims();
        } else {
          this.notyf.error({ message: res?.message || 'Unable to submit', duration: 8000 });
          this.scheduleValidate();
        }
      },
      error: () => {
        this.busy = false;
        this.notyf.error('Unable to submit');
      },
    });
  }

  // ── Detail / decisions ──

  open(id: string): void {
    this.openId = id;
    this.detail = null;
    this.api.myClaimDetail(id).subscribe((res: any) => {
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

  private refreshAll(): void {
    this.loadClaims();
    this.loadApprovals();
  }

  onDecide(d: ClaimDecision): void {
    const id = this.openId!;
    this.run(this.api.myAct(id, d.action, d.comments), () => {
      this.open(id);
      this.refreshAll();
    });
  }

  onPay(payment: any): void {
    const id = this.openId!;
    this.run(this.api.myMarkPaid({ ids: [id], ...payment }), () => {
      this.open(id);
      this.refreshAll();
    });
  }

  async onCancel(): Promise<void> {
    const ok = await Swal.fire({ title: 'Withdraw this claim?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Withdraw' });
    if (!ok.isConfirmed) return;
    const id = this.openId!;
    this.run(this.api.cancel(id), () => {
      this.open(id);
      this.loadClaims();
    });
  }

  // ── Finance payables ──

  togglePayable(id: string, checked: boolean): void {
    checked ? this.selectedPayables.add(id) : this.selectedPayables.delete(id);
  }

  get selectedPayableTotal(): number {
    return this.payables.filter((p) => this.selectedPayables.has(p.id)).reduce((s, p) => s + Number(p.amount), 0);
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

  submitBulkPay(): void {
    this.run(this.api.myMarkPaid({ ids: [...this.selectedPayables], ...this.bulkPayment }), () => {
      this.bulkPayment = null;
      this.loadPayables();
    });
  }
}
