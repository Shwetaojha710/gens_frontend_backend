import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import * as bootstrap from 'bootstrap';
import { PayrollService } from '../../services/payroll.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';

interface AppraisalRecord {
  id: any;
  employeeId: any;
  empCode: string;
  employeeName: string;
  department: string | null;
  designation: string | null;
  percent: number;
  effectiveDate: string | null;
  oldCTC: number;
  newCTC: number;
  appliedOn: string | null;
  canEdit: boolean;
}

interface SalaryHead {
  key: string;
  source: string;
  id: any;
  name: string;
  type: string;
  componentType: 'payable' | 'deductible';
  currentAmount: number;
  increase: number;
  newAmount: number;
  closed: boolean;
}

interface AppraisalSummary {
  currentCTC: number;
  newCTC: number;
  totalIncrease: number;
}

@Component({
  selector: 'app-appraisal-list',
  imports: [CommonModule, FormsModule, SearchPaginationComponent],
  templateUrl: './appraisal-list.component.html',
  styleUrl: './appraisal-list.component.css',
})
export class AppraisalListComponent implements OnInit {
  private readonly notyf = new Notyf();
  private readonly currency = JSON.parse(localStorage.getItem('currency') || '{}');

  records: AppraisalRecord[] = [];
  filteredRecords: AppraisalRecord[] = [];
  pagedRecords: AppraisalRecord[] = [];

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;

  isLoading = false;
  isSaving = false;

  selected: AppraisalRecord | null = null;
  percent: number | null = null;
  effectiveDate = '';
  heads: SalaryHead[] = [];
  summary: AppraisalSummary = { currentCTC: 0, newCTC: 0, totalIncrease: 0 };
  viewMode: 'monthly' | 'yearly' = 'yearly';

  private closedHeadKeys = new Set<string>();

  constructor(private readonly payrollService: PayrollService) {}

  ngOnInit(): void {
    this.loadList();
  }

  displayAmt(amount: number): number {
    const n = Number(amount) || 0;
    return this.viewMode === 'monthly' ? Math.round(n / 12) : Math.round(n);
  }

  setViewMode(mode: 'monthly' | 'yearly'): void {
    this.viewMode = mode;
  }

  loadList(): void {
    this.isLoading = true;
    this.payrollService.getAppraisalList({}).subscribe({
      next: (res: any) => {
        this.records = res?.data || [];
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.notyf.error('Failed to load appraisals');
        this.isLoading = false;
      },
    });
  }

  onSearch(term: string): void {
    this.searchTerm = (term || '').toLowerCase();
    this.currentPage = 1;
    this.applyFilter();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaged();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePaged();
  }

  private applyFilter(): void {
    const term = this.searchTerm;
    this.filteredRecords = !term
      ? this.records
      : this.records.filter((e) =>
          [e.empCode, e.employeeName, e.department, e.designation]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term)),
        );
    this.updatePaged();
  }

  private updatePaged(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedRecords = this.filteredRecords.slice(start, start + this.pageSize);
  }

  openEdit(item: AppraisalRecord): void {
    if (!item.canEdit) {
      this.notyf.error('Only the latest appraisal for this employee can be edited');
      return;
    }
    this.selected = item;
    this.percent = item.percent;
    this.effectiveDate = item.effectiveDate ? String(item.effectiveDate).slice(0, 10) : '';
    this.closedHeadKeys.clear();
    this.heads = [];
    this.summary = { currentCTC: 0, newCTC: 0, totalIncrease: 0 };

    this.payrollService.getAppraisalRecord({ appraisalId: item.id }).subscribe({
      next: (res: any) => {
        if (res?.status === false) {
          this.notyf.error(res?.message || 'Failed to load appraisal');
          return;
        }
        this.heads = res?.data?.heads || [];
        this.summary = res?.data?.summary || this.summary;
        this.percent = res?.data?.percent ?? this.percent;
        this.effectiveDate = res?.data?.effectiveDate
          ? String(res.data.effectiveDate).slice(0, 10)
          : this.effectiveDate;
        this.closedHeadKeys.clear();
        for (const h of this.heads) {
          if (h.closed) this.closedHeadKeys.add(h.key);
        }
        this.showModal('appraisalEditModal');
      },
      error: (err) => {
        this.notyf.error(err?.error?.message || 'Failed to load appraisal');
      },
    });
  }

  onPercentChange(): void {
    this.refreshPreview();
  }

  openAllPayables(): void {
    for (const h of this.heads) {
      if (h.componentType === 'payable') this.closedHeadKeys.delete(h.key);
    }
    this.refreshPreview();
  }

  closeAllPayables(): void {
    for (const h of this.heads) {
      if (h.componentType === 'payable') this.closedHeadKeys.add(h.key);
    }
    this.refreshPreview();
  }

  openAllDeductions(): void {
    for (const h of this.heads) {
      if (h.componentType === 'deductible') this.closedHeadKeys.delete(h.key);
    }
    this.refreshPreview();
  }

  closeAllDeductions(): void {
    for (const h of this.heads) {
      if (h.componentType === 'deductible') this.closedHeadKeys.add(h.key);
    }
    this.refreshPreview();
  }

  toggleHead(head: SalaryHead): void {
    if (this.closedHeadKeys.has(head.key)) this.closedHeadKeys.delete(head.key);
    else this.closedHeadKeys.add(head.key);
    this.refreshPreview();
  }

  private refreshPreview(): void {
    if (!this.selected) return;
    this.payrollService
      .previewAppraisalEdit({
        appraisalId: this.selected.id,
        percent: this.percent || 0,
        closedHeadKeys: Array.from(this.closedHeadKeys),
      })
      .subscribe({
        next: (res: any) => {
          this.heads = res?.data?.heads || this.heads;
          this.summary = res?.data?.summary || this.summary;
        },
        error: (err) => {
          this.notyf.error(err?.error?.message || 'Failed to preview appraisal');
        },
      });
  }

  updateAppraisal(): void {
    if (!this.selected || this.percent === null || this.percent === undefined) return;
    if (!this.effectiveDate) {
      this.notyf.error('Effective date is required');
      return;
    }

    this.isSaving = true;
    this.payrollService
      .updateAppraisal({
        appraisalId: this.selected.id,
        percent: this.percent,
        closedHeadKeys: Array.from(this.closedHeadKeys),
        effectiveDate: this.effectiveDate,
      })
      .subscribe({
        next: (res: any) => {
          this.isSaving = false;
          if (res?.status === false) {
            this.notyf.error(res?.message || 'Failed to update appraisal');
            return;
          }
          this.notyf.success('Appraisal updated successfully');
          this.hideModal('appraisalEditModal');
          this.loadList();
        },
        error: (err) => {
          this.notyf.error(err?.error?.message || 'Failed to update appraisal');
          this.isSaving = false;
        },
      });
  }

  formatAmt(amount: any): string {
    const val = Math.round(Number(amount) || 0);
    const symbol = this.currency?.name ? `${this.currency.name} ` : '';
    return `${symbol}${val.toLocaleString('en-IN')}`;
  }

  private showModal(id: string): void {
    const el = document.getElementById(id);
    if (el) new bootstrap.Modal(el).show();
  }

  private hideModal(id: string): void {
    const el = document.getElementById(id);
    if (el) bootstrap.Modal.getInstance(el)?.hide();
  }
}
