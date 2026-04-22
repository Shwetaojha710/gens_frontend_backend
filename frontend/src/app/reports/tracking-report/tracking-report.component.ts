import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

import { AttendanceService } from '../../services/attendance.service';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-tracking-report',
  standalone: true,
  imports: [NgSelectModule, FormsModule, CommonModule],
  templateUrl: './tracking-report.component.html',
  styleUrl: './tracking-report.component.css'
})
export class TrackingReportComponent implements OnInit {

  // ── Core State ────────────────────────────────────────────────────────────
  obj: any = {};
  notyf: Notyf;
  today: Date = new Date();

  // Expand/collapse state for detail rows
  expandedRows: Set<string> = new Set();

  // Sort state
  sortField: string = 'visit_date';
  sortDir: number = 1;

  // ── Dropdown Lists ────────────────────────────────────────────────────────
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
    { value: '12', label: 'December' }
  ];

  reportType = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  quarterList = [
    { value: '1', label: 'Q1 (Jan – Mar)' },
    { value: '2', label: 'Q2 (Apr – Jun)' },
    { value: '3', label: 'Q3 (Jul – Sep)' },
    { value: '4', label: 'Q4 (Oct – Dec)' }
  ];

  EmpList: any[] = [];
  yearList: any[] = [];
  PlaceDD: any[] = [];

  // ── Data State ────────────────────────────────────────────────────────────
  reportData: any[] = [];
  originalList: any[] = [];

  // ── Pagination ────────────────────────────────────────────────────────────
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  pageNumbers: number[] = [];

  // ── Misc ──────────────────────────────────────────────────────────────────
  searchText: string = '';
  baseurl: string = '';

  // ── Summary Computed Values ───────────────────────────────────────────────
  uniqueEmployeeCount: number = 0;
  totalVisitsCount: number = 0;
  totalDurationFormatted: string = '0h 0m 0s';
  uniquePlacesCount: number = 0;

  // ─────────────────────────────────────────────────────────────────────────
  constructor(
    private master: MasterService,
    private attendanceService: AttendanceService,
    public statusService: StatusService,
    private router: Router,
    private locationService: LocationService
  ) {
    this.notyf = new Notyf();

    // Default filter values
    this.obj['emp_id'] = 'All';
    this.obj['report_type'] = 'monthly';
    this.obj['year'] = new Date().getFullYear().toString();
    const m = new Date().getMonth() + 1;
    this.obj['month'] = m < 10 ? '0' + m : m.toString();

    this.loadVisitPlaceDD();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    this.baseurl = this.master.getBaseUrl();
    await this.loadEmpList();
    await this.loadYearList();
    this.loadReport();
  }

  // ── Dropdown Loaders ──────────────────────────────────────────────────────

  loadVisitPlaceDD(): void {
    this.PlaceDD = [];
    this.locationService.VisitPlaceDD().subscribe({
      next: (response: any) => {
        if (response?.status === true) {
          this.PlaceDD = response.data;
        } else if (response?.status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(response?.message || 'Failed to load places');
        }
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Error loading places');
      }
    });
  }

  async loadEmpList(): Promise<void> {
    return new Promise((resolve) => {
      this.EmpList = [];
      this.locationService.getActiveTrackingUsers().subscribe({
        next: (response: any) => {
          const msg = response?.message || 'Data loaded successfully';
          const status = this.statusService.handleResponseStatus(response?.status, msg);

          if (status === true) {
            const employees = response.data.map((item: any, index: number) => ({
              ...item,
              si_no: index + 1,
              label: `${item.firstName} ${item.lastName} - ${item.empCode}`,
              value: item.id,
              profileImage: item.profileImage
                ? `${this.baseurl}${item.profileImage}`
                : item.gender === 'Female'
                  ? '../../assets/img/avatars/2.png'
                  : '../../assets/img/avatars/1.png'
            }));

            this.EmpList = [{ label: 'All', value: 'All' }, ...employees];
          } else if (status === 'expired') {
            this.router.navigate(['login']);
          }
          resolve();
        },
        error: (err: any) => {
          console.error('Error loading employees:', err);
          resolve();
        }
      });
    });
  }

  async loadYearList(): Promise<void> {
    return new Promise((resolve) => {
      this.yearList = [];
      this.master.getAttendanceYear().subscribe({
        next: (data: any) => {
          if (data?.status === true) {
            this.yearList = data.data;
          } else if (data?.status === 'expired') {
            this.router.navigate(['login']);
          } else {
            this.notyf.error(data?.message || 'Failed to load years');
          }
          resolve();
        },
        error: (err: any) => {
          console.error('Error loading years:', err);
          resolve();
        }
      });
    });
  }

  // ── Report Load ───────────────────────────────────────────────────────────

  loadReport(): void {
    const payload = {
      employeeId: this.obj['emp_id'],
      report_type: this.obj['report_type'],
      year: this.obj['year'],
      month: this.obj['month'],
      quarter: this.obj['quarter'],
      visit_place: this.obj['visit_place']
    };

    this.reportData = [];
    this.originalList = [];

    this.locationService.getVisitReport(payload).subscribe({
      next: (response: any) => {
        if (response?.status === true) {
          this.notyf.success(response?.message || 'Report loaded successfully');
          this.originalList = response.data;
          this.computeSummary();
          this.currentPage = 1;
          this.updateDisplayedList();
        } else if (response?.status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(response?.message || 'No data found');
        }
      },
      error: (err: any) => {
        console.error('Error loading report:', err);
        this.notyf.error(err?.error?.message || 'Failed to load report');
      }
    });
  }

  resetFilters(): void {
    this.obj['emp_id'] = 'All';
    this.obj['report_type'] = 'monthly';
    const m = new Date().getMonth() + 1;
    this.obj['month'] = m < 10 ? '0' + m : m.toString();
    this.obj['year'] = new Date().getFullYear().toString();
    this.obj['visit_place'] = null;
    this.obj['quarter'] = null;
    this.searchText = '';
    this.loadReport();
  }

  // ── Summary Computation ───────────────────────────────────────────────────

  computeSummary(): void {
    const empSet = new Set<string>();
    const placeSet = new Set<string>();
    let totalVisits = 0;
    let totalSecs = 0;

    this.originalList.forEach((r: any) => {
      empSet.add(r.employeeId || r.emp_name);
      totalVisits += r.total_visits || 0;
      totalSecs += this.durationToSeconds(r.total_duration || '0h 0m 0s');
      (r.visits || []).forEach((v: any) => {
        if (v.visit_place) placeSet.add(v.visit_place);
      });
    });

    this.uniqueEmployeeCount = empSet.size;
    this.totalVisitsCount = totalVisits;
    this.uniquePlacesCount = placeSet.size;
    this.totalDurationFormatted = this.secondsToDuration(totalSecs);
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  updateDisplayedList(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.reportData = this.originalList.slice(start, end);
    this.totalPages = Math.ceil(this.originalList.length / this.itemsPerPage);
    this.buildPageNumbers();
  }

  buildPageNumbers(): void {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      if (
        i === 1 ||
        i === this.totalPages ||
        Math.abs(i - this.currentPage) <= 2
      ) {
        pages.push(i);
      }
    }
    this.pageNumbers = pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onItemsPerPageChange(event: any): void {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1;
    this.updateDisplayedList();
  }

  // ── Search / Filter ───────────────────────────────────────────────────────

  applyFilter(event: any): void {
    const value = (event?.target?.value || '').toLowerCase().trim();
    this.searchText = value;

    if (!value) {
      this.currentPage = 1;
      this.updateDisplayedList();
      return;
    }

    this.reportData = this.originalList.filter((item: any) =>
      JSON.stringify(item).toLowerCase().includes(value)
    );
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDir *= -1;
    } else {
      this.sortField = field;
      this.sortDir = 1;
    }

    this.originalList.sort((a: any, b: any) => {
      let va = a[field];
      let vb = b[field];

      if (field === 'total_visits') {
        va = +va;
        vb = +vb;
      }

      if (field === 'total_duration') {
        va = this.durationToSeconds(va);
        vb = this.durationToSeconds(vb);
      }

      if (va < vb) return -this.sortDir;
      if (va > vb) return this.sortDir;
      return 0;
    });

    this.currentPage = 1;
    this.updateDisplayedList();
  }

  // ── Row Expand ────────────────────────────────────────────────────────────

  getRowKey(index: number): string {
    const item = this.reportData[index];
    return `${item?.employeeId || item?.emp_name}_${item?.visit_date}_${index}`;
  }

  toggleExpand(key: string): void {
    if (this.expandedRows.has(key)) {
      this.expandedRows.delete(key);
    } else {
      this.expandedRows.add(key);
    }
  }

  // ── Address Lookup ────────────────────────────────────────────────────────

  async viewAddress(item: any): Promise<void> {
    if (!item.latitude || !item.longitude) return;
    item.address = await this.getAddressFromAPI(item.latitude, item.longitude);
  }

  async getAddressFromAPI(lat: number, lng: number): Promise<string | null> {
    try {
      const response: any = await this.locationService.getAddressFromGlobalVTS(lat, lng);
      if (response?.address && typeof response.address === 'string' && response.address.trim() !== '') {
        return response.address;
      }
      return null;
    } catch (error) {
      console.error('Error fetching address:', error);
      return null;
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────

  export(): void {
    const exportData: any[] = [];

    this.originalList.forEach((employee: any) => {
      const places = this.getUniquePlaces(employee.visits).join(' | ');
      const purposes = this.getUniquePurposes(employee.visits).join(' | ');
      const remarks = this.getUniqueRemarks(employee.visits).join(' | ');

      exportData.push({
        'Employee Name': this.getEmployeeName(employee.emp_name),
        'Employee Code': this.getEmployeeCode(employee.emp_name),
        'Visit Date': employee.visit_date,
        'Total Visits': employee.total_visits,
        'Total Duration': employee.total_duration,
        'Visit Place(s)': places,
        'Purpose(s)': purposes,
        'Remark(s)': remarks
      });
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Tracking Report': worksheet },
      SheetNames: ['Tracking Report']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(blob, `tracking_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ── Template Helpers ──────────────────────────────────────────────────────

  getEmployeeCode(empName: string): string {
    if (!empName) return '';
    const m = empName.match(/^([A-Z0-9]+)\s/);
    return m ? m[1] : '';
  }

  getEmployeeName(empName: string): string {
    if (!empName) return '';
    return empName.replace(/^[A-Z0-9]+\s/, '');
  }

  getUniquePlaces(visits: any[]): string[] {
    if (!visits) return [];
    return [...new Set(visits.filter((v: any) => v.visit_place).map((v: any) => v.visit_place))];
  }

  getUniquePurposes(visits: any[]): string[] {
    if (!visits) return [];
    return [...new Set(visits.filter((v: any) => v.purpose).map((v: any) => v.purpose))];
  }

  getUniqueRemarks(visits: any[]): string[] {
    if (!visits) return [];
    return [...new Set(visits.filter((v: any) => v.remark).map((v: any) => v.remark))];
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  // ── Duration Utilities ────────────────────────────────────────────────────

  durationToSeconds(dur: string): number {
    if (!dur) return 0;
    const m = dur.match(/(\d+)h\s+(\d+)m\s+(\d+)s/);
    if (!m) return 0;
    return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
  }

  secondsToDuration(s: number): string {
    const h = Math.floor(s / 3600);
    const min = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${min}m ${sec}s`;
  }
}
