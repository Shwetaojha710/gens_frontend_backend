import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';

interface ContractualRow {
  approvalId: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  hourlyRate: number | null;
  date: string;
  checkIn: string;
  checkOut: string;
  totalHours: number | string;
  requiredHours: number;
  hoursComplete: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approverId: string | null;
  approvedAt: string | null;
  remark: string | null;
}

@Component({
  selector: 'app-contractual-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './contractual-approval.component.html',
  styleUrl: './contractual-approval.component.css',
})
export class ContractualApprovalComponent implements OnInit {
  private notyf = new Notyf();

  // filters
  startDate = '';
  endDate = '';
  selectedEmpId: string | null = null;
  empList: { value: string; label: string; hourlyRate: number | null }[] = [];

  rows: ContractualRow[] = [];
  loading = false;
  actionLoading = new Set<string>();
  bulkLoading = false;

  // selection
  selectedIds = new Set<string>();

  // pagination
  currentPage = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50, 100];

  constructor(private master: MasterService) {}

  ngOnInit(): void {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.endDate = `${y}-${m}-${d}`;
    this.startDate = `${y}-${m}-01`;
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.master.getContractualEmployees().subscribe({
      next: (res: any) => {
        if (res?.status === true) this.empList = res.data || [];
      },
      error: () => {},
    });
  }

  load(): void {
    if (!this.startDate || !this.endDate) {
      this.notyf.error('Please select date range');
      return;
    }
    this.loading = true;
    this.rows = [];
    this.selectedIds.clear();
    const body: any = { startDate: this.startDate, endDate: this.endDate };
    if (this.selectedEmpId) body.employeeId = this.selectedEmpId;

    this.master.getContractualAttendanceList(body).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status === true) {
          this.rows = res.data || [];
          this.currentPage = 1;
          if (!this.rows.length) this.notyf.error('No records found for the selected range');
        } else {
          this.notyf.error(res?.message || 'No records found');
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.notyf.error(err?.error?.message || 'Failed to load records');
      },
    });
  }

  // ── Single row actions ───────────────────────────────────────
  approve(row: ContractualRow): void { this.updateStatus(row, 'approved'); }
  reject(row: ContractualRow): void  { this.updateStatus(row, 'rejected'); }

  private updateStatus(row: ContractualRow, status: 'approved' | 'rejected'): void {
    if (this.actionLoading.has(row.approvalId)) return;
    this.actionLoading.add(row.approvalId);
    this.master.approveContractualDay({ approvalId: row.approvalId, status }).subscribe({
      next: (res: any) => {
        this.actionLoading.delete(row.approvalId);
        if (res?.status === true) {
          row.status = status;
          this.selectedIds.delete(row.approvalId);
          this.notyf.success(`Attendance ${status}`);
        } else {
          this.notyf.error(res?.message || 'Action failed');
        }
      },
      error: (err: any) => {
        this.actionLoading.delete(row.approvalId);
        this.notyf.error(err?.error?.message || 'Action failed');
      },
    });
  }

  // ── Bulk actions ─────────────────────────────────────────────
  get pendingSelected(): ContractualRow[] {
    return this.rows.filter(r => this.selectedIds.has(r.approvalId) && r.status === 'pending');
  }

  async bulkApprove(): Promise<void> { await this.bulkUpdate('approved'); }
  async bulkReject(): Promise<void>  { await this.bulkUpdate('rejected'); }

  private async bulkUpdate(status: 'approved' | 'rejected'): Promise<void> {
    const targets = this.pendingSelected;
    if (!targets.length) return;
    this.bulkLoading = true;
    let successCount = 0;

    for (const row of targets) {
      try {
        const res: any = await this.master
          .approveContractualDay({ approvalId: row.approvalId, status })
          .toPromise();
        if (res?.status === true) {
          row.status = status;
          this.selectedIds.delete(row.approvalId);
          successCount++;
        }
      } catch { /* continue */ }
    }

    this.bulkLoading = false;
    if (successCount) this.notyf.success(`${successCount} record(s) ${status}`);
  }

  // ── Checkbox selection ────────────────────────────────────────
  toggleRow(row: ContractualRow): void {
    if (this.selectedIds.has(row.approvalId)) {
      this.selectedIds.delete(row.approvalId);
    } else {
      this.selectedIds.add(row.approvalId);
    }
  }

  isSelected(row: ContractualRow): boolean {
    return this.selectedIds.has(row.approvalId);
  }

  /** Pending rows on current page */
  private get pendingPageRows(): ContractualRow[] {
    return this.pagedRows.filter(r => r.status === 'pending');
  }

  get allPageSelected(): boolean {
    return this.pendingPageRows.length > 0 &&
      this.pendingPageRows.every(r => this.selectedIds.has(r.approvalId));
  }

  get somePageSelected(): boolean {
    return this.pendingPageRows.some(r => this.selectedIds.has(r.approvalId)) && !this.allPageSelected;
  }

  toggleSelectAll(): void {
    if (this.allPageSelected) {
      this.pendingPageRows.forEach(r => this.selectedIds.delete(r.approvalId));
    } else {
      this.pendingPageRows.forEach(r => this.selectedIds.add(r.approvalId));
    }
  }

  // ── Pagination ────────────────────────────────────────────────
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.selectedIds.clear();
  }

  get pagedRows(): ContractualRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.rows.length / this.pageSize);
  }

  get pageNumbers(): number[] {
    // show max 5 page buttons around current
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end   = Math.min(total, this.currentPage + 2);
    if (start > 1) { pages.push(1); if (start > 2) pages.push(-1); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total) { if (end < total - 1) pages.push(-1); pages.push(total); }
    return pages;
  }

  isActionLoading(row: ContractualRow): boolean {
    return this.actionLoading.has(row.approvalId);
  }

  // ── Display helpers ───────────────────────────────────────────
  statusClass(status: string): string {
    if (status === 'approved') return 'badge-outline-success';
    if (status === 'rejected') return 'badge-outline-danger';
    return 'badge-outline-warning';
  }

  hoursClass(row: ContractualRow): string {
    if (row.totalHours === '—') return 'text-muted';
    return row.hoursComplete ? 'text-success fw-semibold' : 'text-danger fw-semibold';
  }

  estimatedPay(row: ContractualRow): string {
    if (!row.hourlyRate || row.totalHours === '—') return '—';
    const pay = (row.hourlyRate as number) * (row.totalHours as number);
    return '₹' + pay.toFixed(2);
  }

  trackById(_: number, row: ContractualRow): string {
    return row.approvalId;
  }

  get showingFrom(): number { return this.rows.length ? (this.currentPage - 1) * this.pageSize + 1 : 0; }
  get showingTo(): number   { return Math.min(this.currentPage * this.pageSize, this.rows.length); }
}
