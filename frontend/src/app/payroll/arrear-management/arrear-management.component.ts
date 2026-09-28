import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import * as bootstrap from 'bootstrap';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import { MasterService } from '../../services/master.service';
import { PayrollService } from '../../services/payroll.service';
import { StatusService } from '../../services/status.service';

@Component({
  selector: 'app-arrear-management',
  standalone: true,
  imports: [FormsModule, CommonModule, NgSelectModule, SearchPaginationComponent],
  templateUrl: './arrear-management.component.html',
  styleUrl: './arrear-management.component.css',
})
export class ArrearManagementComponent {
  obj: any = {};
  notyf: Notyf;
  createFlag = false;
  editId: string | null = null;
  loading = false;
  calculating = false;

  EmpList: any[] = [];
  yearList: any[] = [];
  arrearList: any[] = [];
  originalList: any[] = [];
  filteredList: any[] = [];

  salaryRows: any[] = [];
  salaryOriginal: any[] = [];
  filteredSalaryRows: any[] = [];
  salarySearchTerm = '';
  masterSelected = false;
  previewRow: any = null;

  selectedDetail: any = null;
  historyLogs: any[] = [];

  statusFilter = 'All';
  filterObj: any = {
    employeeId: 'All',
    status: 'All',
    year: 'All',
    month: 'All',
    effectiveDate: null,
  };
  filterMonthList = [
    { value: 'All', label: 'All Months' },
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  filterYearList: any[] = [];
  statusOptions = [
    { value: 'All', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'paid', label: 'Paid' },
  ];

  monthList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;
  searchText = '';

  constructor(
    private master: MasterService,
    public payroll: PayrollService,
    public statusService: StatusService,
    private router: Router,
  ) {
    this.notyf = new Notyf();
    const today = new Date();
    this.obj = {
      employeeId: 'All',
      fromYear: today.getFullYear(),
      fromMonth: null,
      toYear: today.getFullYear(),
      toMonth: null,
      percentage: null,
      payoutYear: today.getFullYear(),
      payoutMonth: null,
      effectiveDate: today.toISOString().split('T')[0],
      remark: '',
    };
  }

  async ngOnInit() {
    await this.empList();
    await this.getYear();
    await this.fetchList();
  }

  empList() {
    return new Promise<void>((resolve) => {
      this.master.getemployeeList().subscribe((data: any) => {
        if (data['status'] == true) {
          const rows = (data.data || []).filter((item: any) => item.label != 'All');
          this.EmpList = [{ value: 'All', label: 'All Employees' }, ...rows];
        } else if (data['status'] == 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(data['message']);
        }
        resolve();
      });
    });
  }

  getYear() {
    return new Promise<void>((resolve) => {
      this.master.getAttendanceYear().subscribe((data: any) => {
        if (data['status'] == true) {
          this.yearList = data.data || [];
          this.filterYearList = [{ value: 'All', label: 'All Years' }, ...(data.data || [])];
        } else if (data['status'] == 'expired') {
          this.router.navigate(['login']);
        }
        resolve();
      });
    });
  }

  opencreate() {
    this.createFlag = true;
    this.editId = null;
    this.salaryRows = [];
    this.salaryOriginal = [];
    this.filteredSalaryRows = [];
    this.salarySearchTerm = '';
    this.previewRow = null;
    this.masterSelected = false;
    const today = new Date();
    this.obj = {
      employeeId: 'All',
      fromYear: today.getFullYear(),
      fromMonth: null,
      toYear: today.getFullYear(),
      toMonth: null,
      percentage: null,
      payoutYear: today.getFullYear(),
      payoutMonth: null,
      effectiveDate: today.toISOString().split('T')[0],
      remark: '',
    };
  }

  back() {
    this.createFlag = false;
    this.editId = null;
    this.salaryRows = [];
    this.salaryOriginal = [];
    this.filteredSalaryRows = [];
    this.salarySearchTerm = '';
    this.fetchList();
  }

  setStatusFilter(value: string) {
    this.statusFilter = value;
    this.filterObj.status = value;
    this.currentPage = 1;
    this.fetchList();
  }

  resetListFilters() {
    this.filterObj = {
      employeeId: 'All',
      status: 'All',
      year: 'All',
      month: 'All',
      effectiveDate: null,
    };
    this.statusFilter = 'All';
    this.currentPage = 1;
    this.fetchList();
  }

  getSalaryList() {
    if (!this.obj.fromYear || !this.obj.fromMonth) {
      this.notyf.error('Please select From Year and From Month');
      return;
    }
    if (!this.obj.toYear || !this.obj.toMonth) {
      this.notyf.error('Please select To Year and To Month');
      return;
    }

    this.calculating = true;
    const payload: any = {
      employeeId: this.obj.employeeId || 'All',
      fromYear: Number(this.obj.fromYear),
      fromMonth: Number(this.obj.fromMonth),
      toYear: Number(this.obj.toYear),
      toMonth: Number(this.obj.toMonth),
    };
    if (this.obj.percentage != null && this.obj.percentage !== '') {
      payload.percentage = Number(this.obj.percentage);
    }

    this.payroll.getArrearSalaryList(payload).subscribe({
      next: (response: any) => {
        this.calculating = false;
        const status = this.statusService.handleResponseStatus(
          response.status,
          response.message || '',
        );
        if (status === true) {
          const emps = (response.data?.employees || []).map((e: any) => ({
            ...e,
            percentage: e.percentage ?? this.obj.percentage,
            isSelected: false,
          }));
          this.salaryOriginal = emps;
          this.salaryRows = [...emps];
          this.salarySearchTerm = '';
          this.applySalarySearch();
          this.masterSelected = false;
          if (response.data?.period) {
            this.obj.payoutYear = response.data.period.payoutYear;
            this.obj.payoutMonth = response.data.period.payoutMonth;
          }
          this.notyf.success(response.message || 'Salary list loaded');
        } else if (status == 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(response.message || 'Failed to load salary list');
          this.salaryRows = [];
        }
      },
      error: (err) => {
        this.calculating = false;
        this.notyf.error(err.error?.message || 'Failed to load salary list');
      },
    });
  }

  /** Apply global % and recompute arrears from backend salary list. */
  applyPercentage() {
    if (this.obj.percentage == null || this.obj.percentage === '') {
      this.notyf.error('Please enter percentage');
      return;
    }
    if (!this.obj.fromYear || !this.obj.fromMonth || !this.obj.toYear || !this.obj.toMonth) {
      this.notyf.error('Please select From/To period first');
      return;
    }

    this.calculating = true;
    this.payroll
      .getArrearSalaryList({
        employeeId: this.obj.employeeId || 'All',
        fromYear: Number(this.obj.fromYear),
        fromMonth: Number(this.obj.fromMonth),
        toYear: Number(this.obj.toYear),
        toMonth: Number(this.obj.toMonth),
        percentage: Number(this.obj.percentage),
      })
      .subscribe({
        next: (response: any) => {
          this.calculating = false;
          if (response.status === true) {
            const selectedMap: Record<string, boolean> = {};
            for (const r of this.salaryOriginal) {
              selectedMap[r.employeeId] = !!r.isSelected;
            }
            this.salaryRows = (response.data?.employees || []).map((e: any) => ({
              ...e,
              percentage: Number(this.obj.percentage),
              isSelected: !!selectedMap[e.employeeId],
            }));
            this.salaryOriginal = [...this.salaryRows];
            this.applySalarySearch();
            this.notyf.success('Arrear calculated on percentage');
          } else {
            this.notyf.error(response.message || 'Calculation failed');
          }
        },
        error: (err) => {
          this.calculating = false;
          this.notyf.error(err.error?.message || 'Calculation failed');
        },
      });
  }

  /** Recalc one row: (Salary × %) × monthCount */
  onRowPercentageChange(row: any) {
    const pct = Number(row.percentage || 0);
    const monthlySalary = Number(row.monthlySalary || 0);
    const monthCount = (row.months || []).length || Number(row.monthCount || 0);
    const monthlyIncrement = parseFloat(((monthlySalary * pct) / 100).toFixed(2));
    const totalArrear = parseFloat((monthlyIncrement * monthCount).toFixed(2));

    row.monthlyIncrement = monthlyIncrement;
    row.revisedAfterHike = parseFloat((monthlySalary + monthlyIncrement).toFixed(2));
    row.monthCount = monthCount;
    row.totalArrear = totalArrear;
    row.percentage = pct;
    row.formula = `(${monthlySalary} × ${pct}% = ${monthlyIncrement}) × ${monthCount} months = ${totalArrear}`;
    row.months = (row.months || []).map((m: any) => ({
      ...m,
      actualPaid: monthlySalary,
      arrearAmount: monthlyIncrement,
      monthlyIncrement,
      revisedSalary: parseFloat((monthlySalary + monthlyIncrement).toFixed(2)),
    }));
  }

  applySalarySearch() {
    const term = (this.salarySearchTerm || '').trim().toLowerCase();
    if (!term) {
      this.filteredSalaryRows = [...this.salaryOriginal];
    } else {
      this.filteredSalaryRows = this.salaryOriginal.filter((item: any) => {
        const hay = [
          item.employeeName,
          item.empCode,
          item.monthlySalary,
          item.percentage,
          item.monthlyIncrement,
          item.revisedAfterHike,
          item.totalArrear,
        ]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' ');
        return hay.includes(term);
      });
    }
    this.isAllSelected();
  }

  checkUncheckAll() {
    for (const row of this.filteredSalaryRows) {
      row.isSelected = this.masterSelected;
    }
  }

  isAllSelected() {
    this.masterSelected =
      this.filteredSalaryRows.length > 0 &&
      this.filteredSalaryRows.every((r) => r.isSelected);
  }

  get selectedCount(): number {
    return this.salaryOriginal.filter((r) => r.isSelected).length;
  }

  openBreakupModal(row: any) {
    this.previewRow = row;
    const modalEl = document.getElementById('ArrearBreakupModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  saveSelected(submit: boolean) {
    const selected = this.salaryOriginal.filter((r) => r.isSelected);
    if (!selected.length) {
      this.notyf.error('Please select at least one employee');
      return;
    }
    if (!this.obj.effectiveDate) {
      this.notyf.error('Please select Effective Date');
      return;
    }
    const missingPct = selected.some(
      (r) => r.percentage == null || r.percentage === '' || Number(r.percentage) < 0,
    );
    if (missingPct) {
      this.notyf.error('Please enter percentage for selected employees');
      return;
    }

    this.loading = true;
    this.payroll
      .createBulkArrear({
        fromYear: Number(this.obj.fromYear),
        fromMonth: Number(this.obj.fromMonth),
        toYear: Number(this.obj.toYear),
        toMonth: Number(this.obj.toMonth),
        percentage: Number(this.obj.percentage || selected[0].percentage),
        payoutYear: this.obj.payoutYear ? Number(this.obj.payoutYear) : undefined,
        payoutMonth: this.obj.payoutMonth ? Number(this.obj.payoutMonth) : undefined,
        effectiveDate: this.obj.effectiveDate,
        remark: this.obj.remark || '',
        submit,
        employees: selected.map((r) => ({
          employeeId: r.employeeId,
          percentage: Number(r.percentage),
        })),
      })
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response.status === true) {
            const skipped = response.data?.skippedCount || 0;
            let msg = response.message || 'Saved';
            if (skipped) msg += ` (${skipped} skipped)`;
            this.notyf.success(msg);
            this.back();
          } else {
            this.notyf.error(response.message || 'Save failed');
          }
        },
        error: (err) => {
          this.loading = false;
          this.notyf.error(err.error?.message || 'Save failed');
        },
      });
  }

  fetchList() {
    this.loading = true;
    this.statusFilter = this.filterObj.status || 'All';
    this.currentPage = 1;
    const body: any = {};
    if (this.filterObj.employeeId && this.filterObj.employeeId !== 'All') {
      body.employeeId = this.filterObj.employeeId;
    }
    if (this.filterObj.status && this.filterObj.status !== 'All') {
      body.status = this.filterObj.status;
    } else if (this.statusFilter && this.statusFilter !== 'All') {
      body.status = this.statusFilter;
    }
    if (this.filterObj.year && this.filterObj.year !== 'All') {
      body.year = Number(this.filterObj.year);
    }
    if (this.filterObj.month && this.filterObj.month !== 'All') {
      body.month = Number(this.filterObj.month);
    }
    if (this.filterObj.effectiveDate) {
      body.effectiveDate = this.filterObj.effectiveDate;
    }
    this.payroll.getArrearList(body).subscribe({
      next: (response: any) => {
        this.loading = false;
        const status = this.statusService.handleResponseStatus(
          response.status,
          response.message || '',
        );
        if (status === true) {
          this.originalList = response.data || [];
          this.arrearList = [...this.originalList];
          this.applyFilters();
        } else if (status == 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(response.message || 'Failed to load');
        }
      },
      error: (err) => {
        this.loading = false;
        this.notyf.error(err.error?.message || 'Failed to load');
      },
    });
  }

  onSearch(term: string) {
    this.searchTerm = (term || '').toLowerCase();
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFilters();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.itemsPerPage = size;
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let data = [...this.originalList];
    this.searchText = (this.searchTerm || '').trim();
    if (this.searchText) {
      data = data.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase()),
      );
    }
    this.arrearList = data;
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredList = data.slice(start, start + this.pageSize);
  }

  getStatusClass(status: any): string {
    switch ((status || '').toLowerCase()) {
      case 'approved':
      case 'paid':
        return 'badge-outline-success';
      case 'rejected':
        return 'badge-outline-danger';
      case 'pending':
        return 'badge-outline-warning';
      case 'draft':
        return 'badge-outline-secondary';
      default:
        return 'badge-outline-secondary';
    }
  }

  viewDetails(row: any) {
    this.payroll.getArrearDetails({ id: row.id }).subscribe({
      next: (response: any) => {
        const status = this.statusService.handleResponseStatus(
          response.status,
          response.message || '',
        );
        if (status === true) {
          this.selectedDetail = response.data;
          this.loadHistory(row.id);
          const modalEl = document.getElementById('ArrearDetailModal');
          if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
          }
        } else if (status == 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(response.message);
        }
      },
      error: (err) => this.notyf.error(err.error?.message || 'Failed'),
    });
  }

  loadHistory(id: string) {
    this.payroll.getArrearStatusHistory({ id }).subscribe({
      next: (response: any) => {
        if (response.status === true) {
          this.historyLogs = response.data?.history || [];
        }
      },
    });
  }

  submitRow(row: any) {
    Swal.fire({
      title: 'Submit arrear?',
      text: 'This will send the arrear for approval.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Submit',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.payroll.submitArrear({ id: row.id }).subscribe({
        next: (response: any) => {
          if (response.status === true) {
            this.notyf.success(response.message);
            this.fetchList();
          } else {
            this.notyf.error(response.message);
          }
        },
        error: (err) => this.notyf.error(err.error?.message || 'Failed'),
      });
    });
  }

  approveRow(row: any) {
    Swal.fire({
      title: 'Approve arrear?',
      text: `Total arrear ₹${row.totalArrear} will be added to ${row.payoutLabel || 'payout month'} salary.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.payroll
        .approveArrear({
          id: row.id,
          payoutYear: row.payoutYear,
          payoutMonth: row.payoutMonth,
        })
        .subscribe({
          next: (response: any) => {
            if (response.status === true) {
              this.notyf.success(response.message);
              this.fetchList();
            } else {
              this.notyf.error(response.message);
            }
          },
          error: (err) => this.notyf.error(err.error?.message || 'Failed'),
        });
    });
  }

  rejectRow(row: any) {
    Swal.fire({
      title: 'Reject arrear?',
      input: 'text',
      inputPlaceholder: 'Rejection remark (optional)',
      showCancelButton: true,
      confirmButtonText: 'Reject',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.payroll.rejectArrear({ id: row.id, remark: result.value || '' }).subscribe({
        next: (response: any) => {
          if (response.status === true) {
            this.notyf.success(response.message);
            this.fetchList();
          } else {
            this.notyf.error(response.message);
          }
        },
        error: (err) => this.notyf.error(err.error?.message || 'Failed'),
      });
    });
  }
}
