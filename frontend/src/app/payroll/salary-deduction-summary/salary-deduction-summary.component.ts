import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';
import { PayrollService } from '../../services/payroll.service';
import { StatusService } from '../../services/status.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
declare let bootstrap: any;

@Component({
  selector: 'app-salary-deduction-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, SearchPaginationComponent],
  templateUrl: './salary-deduction-summary.component.html',
  styleUrl: './salary-deduction-summary.component.css'
})
export class SalaryDeductionSummaryComponent implements OnInit {
  notyf = new Notyf();
  isLoading = false;
  empList: any[] = [];

  monthList = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  yearList: any[] = [];
  obj: any = {};

  allDeductionList: any[] = [];
  filteredList: any[] = [];
  pagedList: any[] = [];
  searchName = '';

  pageSize = 10;
  currentPage = 1;
  itemsPerPage = 10;

  constructor(
    private master: MasterService,
    private payroll: PayrollService,
    private statusService: StatusService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.loadEmpList();
    this.getYear();
  }

  loadEmpList() {
    this.master.getemployeeList().subscribe((data: any) => {
      if (data['status'] == true) {
        this.empList = data.data;
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login']);
      }
    });
  }

  getYear() {
    this.master.getAttendanceYear().subscribe((data: any) => {
      if (data['status'] == true) {
        this.yearList = data.data;
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login']);
      }
    });
  }

  onSubmit() {
    if (!this.obj['month'] || !this.obj['year']) {
      this.notyf.error('Please select Month and Year');
      return;
    }
    this.isLoading = true;
    this.allDeductionList = [];
    this.filteredList = [];
    this.searchName = '';

    const allIds = this.empList
      .map((e: any) => e.value)
      .filter((v: any) => v && v !== 'All');

    const payload = {
      employeeId: allIds,
      month: this.obj['month'],
      year: this.obj['year'],
      onlyDeductions: true,
    };

    this.payroll.getGeneratedSalaryList(payload).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const status = this.statusService.handleResponseStatus(response.status, response.message || '');
        if (status === true) {
          this.allDeductionList = response.data?.salaryList || [];
          this.currentPage = 1;
          this.applyFilters();

          if (this.allDeductionList.length === 0) {
            this.notyf.success('No deductions found for selected month/year');
          }
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(response.message || 'Error fetching data');
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.notyf.error(err.error?.message || 'Error');
      }
    });
  }

  onSearch(term: string) {
    this.searchName = term || '';
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFilters();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.applyFilters();
  }

  onNameSearch() {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    const term = (this.searchName || '').trim().toLowerCase();
    this.filteredList = term
      ? this.allDeductionList.filter((item: any) =>
          (item.employeeName || '').toLowerCase().includes(term)
        )
      : [...this.allDeductionList];

    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedList = this.filteredList.slice(start, start + this.pageSize);
  }

  totalAbsent(): number {
    return this.filteredList.reduce((s, i) => s + Number(i.absent_days || 0), 0);
  }
  totalHalf(): number {
    return this.filteredList.reduce((s, i) => s + Number(i.half_day || 0), 0);
  }
  totalLate(): number {
    return this.filteredList.reduce((s, i) => s + Number(i.late_attendance || 0), 0);
  }

  selectedEmployee: any = null;
  absentDaysList: any[] = [];
  attendanceSettings: any = null;
  joiningInMonth: boolean = false;
  joiningDate: string | null = null;
  isViewLoading: boolean = false;
  modal: any;

  view(item: any) {
    this.selectedEmployee = { ...item };
    this.absentDaysList = [];
    this.attendanceSettings = null;
    this.joiningInMonth = false;
    this.joiningDate = null;
    this.isViewLoading = true;

    this.payroll.empMonthlyLeaveAttDetails({
      employeeId: item.employeeId,
      month: item.month,
      year: item.year,
      shift_name: item.shift,
    }).subscribe({
      next: (response: any) => {
        this.isViewLoading = false;
        const status = this.statusService.handleResponseStatus(response.status, response.message || 'OK');
        if (status === true) {
          const all: any[] = response.data?.attendanceList || [];
          this.attendanceSettings = response.data?.attendanceSetting || null;
          this.joiningInMonth = response.data?.joiningInMonth || false;
          this.joiningDate = response.data?.joiningDate || null;

          const lateAllowance: number = this.attendanceSettings?.lateAllowanceMin || 0;
          let lateCount = 0;
          const result: any[] = [];
          const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));

          for (const rec of sorted) {
            const s = (rec.status || '').toLowerCase();
            if (s === 'absent' || s === 'half day') {
              result.push({ ...rec, deductionReason: s === 'absent' ? 'Absent - Full day deduction' : 'Half Day - 0.5 day deduction' });
            } else if (s.startsWith('late by')) {
              const minutesMatch = rec.status.match(/\d+/g);
              const totalMinutes = minutesMatch ? parseInt(minutesMatch[0], 10) : 0;
              if (totalMinutes > 0) {
                lateCount++;
                if (lateCount > lateAllowance) {
                  result.push({
                    ...rec,
                    deductionReason: `Late attendance - Deduction (${lateCount - lateAllowance} extra, allowance: ${lateAllowance})`,
                    isDeduction: true
                  });
                }
              }
            }
          }

          // Excess leave: expand each leave application into per-day entries,
          // respecting first_half / second_half / full duration types
          const leaveListData: any[] = response.data?.leaveList || [];
          const allowedLeave = parseFloat(this.selectedEmployee?.allowed_leave || '0');
          const leaveDayEntries: { date: string; dayValue: number; durationLabel: string; leaveType: string }[] = [];

          for (const leave of leaveListData) {
            if (!leave.fromDate) continue;
            const fromMs = new Date(leave.fromDate).getTime();
            const toMs = leave.toDate ? new Date(leave.toDate).getTime() : fromMs;
            const days = Math.round((toMs - fromMs) / 86400000) + 1;
            for (let d = 0; d < days; d++) {
              const date = new Date(fromMs + d * 86400000).toISOString().split('T')[0];
              // First day uses duration_type, last day uses to_duration_type, middle days are full
              const durType = d === 0
                ? leave.duration_type
                : (d === days - 1 ? (leave.to_duration_type || 'full') : 'full');
              let dayValue = 1;
              let durationLabel = 'Full Day';
              if (durType === 'first_half') { dayValue = 0.5; durationLabel = 'First Half'; }
              else if (durType === 'second_half') { dayValue = 0.5; durationLabel = 'Second Half'; }
              leaveDayEntries.push({ date, dayValue, durationLabel, leaveType: leave.leave_type_name || 'Leave' });
            }
          }

          // Sort chronologically and push entries that exceed the allowed balance
          leaveDayEntries.sort((a, b) => a.date.localeCompare(b.date));
          let leaveCumulative = 0;
          for (const entry of leaveDayEntries) {
            leaveCumulative += entry.dayValue;
            if (leaveCumulative > allowedLeave) {
              const attEntry = sorted.find((r: any) => r.date === entry.date);
              result.push({
                date: entry.date,
                day: attEntry?.day ?? new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' }),
                checkIn: attEntry?.checkIn ?? null,
                checkOut: attEntry?.checkOut ?? null,
                status: entry.durationLabel === 'Full Day' ? 'On Leave' : entry.durationLabel,
                deductionReason: `Leave without balance - ${entry.durationLabel} (${entry.leaveType}) deduction`,
                isDeduction: true,
                isExcessLeave: true
              });
            }
          }

          // Sort combined result by date
          result.sort((a, b) => a.date.localeCompare(b.date));

          this.absentDaysList = result;

          const modalEl = document.getElementById('DeductionDetailModal');
          if (modalEl) {
            this.modal = new bootstrap.Modal(modalEl);
            this.modal.show();
          }
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(response.message || 'Error fetching details');
        }
      },
      error: (err: any) => {
        this.isViewLoading = false;
        this.notyf.error(err.error?.message || 'Error');
      }
    });
  }
}
