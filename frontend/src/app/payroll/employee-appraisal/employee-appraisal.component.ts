import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import * as bootstrap from 'bootstrap';
import { PayrollService } from '../../services/payroll.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';

interface AppraisalEmployee {
  id: any;
  empCode: string;
  employeeName: string;
  department: string | null;
  designation: string | null;
  currentCTC: number;
  lastSalaryStartDate: string | null;
  hasSalary: boolean;
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
  selector: 'app-employee-appraisal',
  imports: [CommonModule, FormsModule, SearchPaginationComponent],
  templateUrl: './employee-appraisal.component.html',
  styleUrl: './employee-appraisal.component.css',
})
export class EmployeeAppraisalComponent implements OnInit {
  private readonly notyf = new Notyf();
  private readonly currency = JSON.parse(localStorage.getItem('currency') || '{}');

  employees: AppraisalEmployee[] = [];
  filteredEmployees: AppraisalEmployee[] = [];
  pagedEmployees: AppraisalEmployee[] = [];

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;

  selectedEmployeeIds = new Set<any>();
  isLoading = false;
  isSaving = false;
  isBulkSaving = false;

  selectedEmp: AppraisalEmployee | null = null;
  percent: number | null = null;
  effectiveDate: string = new Date().toISOString().slice(0, 10);
  heads: SalaryHead[] = [];
  summary: AppraisalSummary = { currentCTC: 0, newCTC: 0, totalIncrease: 0 };

  bulkPercent: number | null = null;

  private closedHeadKeys = new Set<string>();

  constructor(private readonly payrollService: PayrollService) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.payrollService.getAppraisalEmployees({}).subscribe({
      next: (res: any) => {
        this.employees = res?.data || [];
        this.selectedEmployeeIds.clear();
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.notyf.error('Failed to load employees');
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
    this.updatePagedEmployees();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePagedEmployees();
  }

  private applyFilter(): void {
    const term = this.searchTerm;
    this.filteredEmployees = !term
      ? this.employees
      : this.employees.filter((e) =>
          [e.empCode, e.employeeName, e.department, e.designation]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term)),
        );
    this.updatePagedEmployees();
  }

  private updatePagedEmployees(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedEmployees = this.filteredEmployees.slice(start, start + this.pageSize);
  }

  allPageSelected(): boolean {
    const selectable = this.pagedEmployees.filter((e) => e.hasSalary);
    return selectable.length > 0 && selectable.every((e) => this.selectedEmployeeIds.has(e.id));
  }

  toggleSelectAllPage(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    for (const emp of this.pagedEmployees) {
      if (!emp.hasSalary) continue;
      if (checked) this.selectedEmployeeIds.add(emp.id);
      else this.selectedEmployeeIds.delete(emp.id);
    }
  }

  isSelected(id: any): boolean {
    return this.selectedEmployeeIds.has(id);
  }

  toggleEmployee(item: AppraisalEmployee): void {
    if (this.selectedEmployeeIds.has(item.id)) this.selectedEmployeeIds.delete(item.id);
    else this.selectedEmployeeIds.add(item.id);
  }

  openAppraise(item: AppraisalEmployee): void {
    this.selectedEmp = item;
    this.percent = null;
    this.effectiveDate = new Date().toISOString().slice(0, 10);
    this.closedHeadKeys.clear();
    this.heads = [];
    this.summary = { currentCTC: 0, newCTC: 0, totalIncrease: 0 };

    this.payrollService.getAppraisalDetail({ employeeId: item.id }).subscribe({
      next: (res: any) => {
        this.heads = res?.data?.heads || [];
        this.summary = res?.data?.summary || this.summary;
        this.showModal('appraisalModal');
      },
      error: (err) => {
        this.notyf.error(err?.error?.message || 'Failed to load salary heads');
      },
    });
  }

  onPercentChange(): void {
    this.refreshPreview();
  }

  openAllPayables(): void {
    this.closedHeadKeys.clear();
    this.refreshPreview();
  }

  closeAllPayables(): void {
    for (const h of this.heads) {
      if (h.componentType === 'payable') this.closedHeadKeys.add(h.key);
    }
    this.refreshPreview();
  }

  toggleHead(head: SalaryHead): void {
    if (this.closedHeadKeys.has(head.key)) this.closedHeadKeys.delete(head.key);
    else this.closedHeadKeys.add(head.key);
    this.refreshPreview();
  }

  private refreshPreview(): void {
    if (!this.selectedEmp) return;
    this.payrollService
      .previewAppraisal({
        employeeId: this.selectedEmp.id,
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

  applyAppraisal(): void {
    if (!this.selectedEmp || this.percent === null || this.percent === undefined) return;

    this.isSaving = true;
    this.payrollService
      .applyAppraisal({
        employeeId: this.selectedEmp.id,
        percent: this.percent,
        closedHeadKeys: Array.from(this.closedHeadKeys),
        effectiveDate: this.effectiveDate,
      })
      .subscribe({
        next: () => {
          this.notyf.success('Appraisal applied successfully');
          this.isSaving = false;
          this.hideModal('appraisalModal');
          this.loadEmployees();
        },
        error: (err) => {
          this.notyf.error(err?.error?.message || 'Failed to apply appraisal');
          this.isSaving = false;
        },
      });
  }

  openBulkAppraise(): void {
    this.bulkPercent = null;
    this.effectiveDate = new Date().toISOString().slice(0, 10);
    this.showModal('bulkAppraisalModal');
  }

  applyBulkAppraisal(): void {
    if (this.bulkPercent === null || this.bulkPercent === undefined || !this.selectedEmployeeIds.size) return;

    this.isBulkSaving = true;
    const ids = Array.from(this.selectedEmployeeIds);
    let completed = 0;
    let failed = 0;

    const finish = () => {
      completed++;
      if (completed === ids.length) {
        this.isBulkSaving = false;
        this.hideModal('bulkAppraisalModal');
        this.selectedEmployeeIds.clear();
        this.loadEmployees();
        if (failed) {
          this.notyf.error(`${failed} of ${ids.length} appraisals failed`);
        } else {
          this.notyf.success(`Appraisal applied to ${ids.length} employees`);
        }
      }
    };

    for (const employeeId of ids) {
      this.payrollService
        .applyAppraisal({
          employeeId,
          percent: this.bulkPercent,
          closedHeadKeys: [],
          effectiveDate: this.effectiveDate,
        })
        .subscribe({
          next: finish,
          error: () => {
            failed++;
            finish();
          },
        });
    }
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
