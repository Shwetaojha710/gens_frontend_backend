import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { EmployeeService } from '../../services/employee.service';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';

@Component({
  selector: 'app-leave-ledger',
  imports: [FormsModule, CommonModule, NgSelectModule, SearchPaginationComponent],
  templateUrl: './leave-ledger.component.html',
  styleUrl: './leave-ledger.component.css',
})
export class LeaveLedgerComponent {
  obj: any = {};
  notyf: Notyf;
  EmpList: any[] = [];
  leaveTypeList: any[] = [];
  yearList: any[] = [];
  ledgerList: any[] = [];
  originalList: any[] = [];
  filteredList: any[] = [];

  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;
  searchText = '';

  monthList = [
    { value: 'All', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  MonthObj: any = {
    '1': 'January',
    '2': 'February',
    '3': 'March',
    '4': 'April',
    '5': 'May',
    '6': 'June',
    '7': 'July',
    '8': 'August',
    '9': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December',
  };

  constructor(
    private master: MasterService,
    private empService: EmployeeService,
    public statusService: StatusService,
    private router: Router,
  ) {
    this.notyf = new Notyf();
    const today = new Date();
    this.obj['emp_id'] = 'All';
    this.obj['leaveTypeId'] = 'All';
    this.obj['month'] = 'All';
    this.obj['year'] = today.getFullYear();
  }

  async ngOnInit() {
    await this.empList();
    await this.getYear();
    await this.getLeaveTypeList();
    await this.getLeaveLedger();
  }

  async empList() {
    this.EmpList = [];
    this.master.getemployeeList().subscribe((data: any) => {
      if (data['status'] == true) {
        this.EmpList=data.data || []
        this.EmpList = this.EmpList.filter((item: any) => item.label != 'All')
        // this.EmpList = [{ value: 'All', label: 'All Employees' }, ...(data.data || [])];
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login']);
      } else {
        this.notyf.error(data['message']);
      }
    });
  }

  async getYear() {
    this.yearList = [];
    this.master.getAttendanceYear().subscribe((data: any) => {
      if (data['status'] == true) {
        this.yearList = data.data || [];
        if (!this.obj['year'] && this.yearList.length) {
          this.obj['year'] = this.yearList[0].value;
        }
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login']);
      } else {
        this.notyf.error(data['message']);
      }
    });
  }

  async getLeaveTypeList() {
    this.leaveTypeList = [];
    this.master.getLeaveTypeList().subscribe((data: any) => {
      if (data['status'] == true) {
        this.leaveTypeList = [{ value: 'All', label: 'All Leave Types' }, ...(data.data || [])];
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login']);
      } else {
        this.notyf.error(data['message']);
      }
    });
  }

  getMonthLabel(month: any): string {
    if (month == null || month === '') return '-';
    return this.MonthObj[String(month)] || String(month);
  }

  async getLeaveLedger() {
    if (!this.obj['year']) {
      this.notyf.error('Year is required');
      return;
    }

    const payload: any = {
      employeeId: this.obj['emp_id'] || 'All',
      year: this.obj['year'],
      month: this.obj['month'] || 'All',
      leaveTypeId: this.obj['leaveTypeId'] || 'All',
    };

    this.ledgerList = [];
    this.originalList = [];
    this.filteredList = [];

    this.empService.getLeaveLedger(payload).subscribe({
      next: (response: any) => {
        const message = response.message || 'Data found Successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);

        if (status === true) {
          this.ledgerList = response.data || [];
          this.originalList = [...this.ledgerList];
          this.currentPage = 1;
          this.applyFilters();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.ledgerList = [];
          this.originalList = [];
          this.filteredList = [];
          this.updateSummary([]);
          this.notyf.error(message);
        }
      },
      error: (err) => {
        this.notyf.error(err?.error?.message || 'Failed to load leave ledger');
      },
    });
  }

  onSearch(term: string) {
    if (!term) {
      this.searchText = '';
      this.searchTerm = '';
      this.ledgerList = [...this.originalList];
      this.currentPage = 1;
      this.applyFilters();
    } else {
      this.searchTerm = term.toLowerCase();
      this.currentPage = 1;
      this.applyFilters();
    }
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
    const value = this.searchTerm || '';
    this.searchText = value.trim();

    if (this.searchText !== '') {
      data = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase()),
      );
    }

    this.ledgerList = data;
    this.updateSummary(data);
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredList = data.slice(start, end);
  }

  summary: any = {
    totalAssigned: 0,
    carryForwarded: 0,
    usedLeaves: 0,
    monthlyLeaveCredit: 0,
    remainingLeaves: 0,
  };

  /** Default only if API omits monthlyLeaveCredit; Comp Off / joining rules come from backend */
  monthlyLeaveCredit = 0;

  updateSummary(data: any[]) {
    this.summary = {
      totalAssigned: 0,
      carryForwarded: 0,
      usedLeaves: 0,
      monthlyLeaveCredit: 0,
      remainingLeaves: 0,
    };
    const list = data || [];
    list.forEach((item: any) => {
      this.summary.totalAssigned += Number(item.totalAssigned || 0);
      this.summary.carryForwarded += Number(item.carryForwarded || 0);
      this.summary.usedLeaves += Number(item.usedLeaves || 0);
      this.summary.monthlyLeaveCredit += this.getMonthlyLeave(item);
    });

    // Latest month per employee + leave type = current remaining (do not sum every month)
    if (list.length) {
      const latestByKey: Record<string, any> = {};
      [...list]
        .sort((a: any, b: any) => {
          const yearDiff = Number(a.year || 0) - Number(b.year || 0);
          if (yearDiff !== 0) return yearDiff;
          return Number(a.month || 0) - Number(b.month || 0);
        })
        .forEach((item: any) => {
          const key = `${item.employeeId || ''}_${item.leaveTypeId || ''}`;
          latestByKey[key] = item;
        });

      this.summary.remainingLeaves = Object.values(latestByKey).reduce(
        (sum: number, item: any) => sum + this.calcRemaining(item),
        0,
      );
    }

    this.summary.totalAssigned = Number(this.summary.totalAssigned.toFixed(1));
    this.summary.carryForwarded = Number(this.summary.carryForwarded.toFixed(1));
    this.summary.usedLeaves = Number(this.summary.usedLeaves.toFixed(1));
    this.summary.monthlyLeaveCredit = Number(this.summary.monthlyLeaveCredit.toFixed(1));
    this.summary.remainingLeaves = Number(this.summary.remainingLeaves.toFixed(1));
  }

  getMonthlyLeave(item: any): number {
    return Number(item?.monthlyLeaveCredit != null ? item.monthlyLeaveCredit : 0);
  }

  calcRemaining(item: any): number {
    const carry = Number(item?.carryForwarded || 0);
    const used = Number(item?.usedLeaves || 0);
    const monthly = this.getMonthlyLeave(item);
    return Math.max(0, Number((carry - used + monthly).toFixed(1)));
  }
}
