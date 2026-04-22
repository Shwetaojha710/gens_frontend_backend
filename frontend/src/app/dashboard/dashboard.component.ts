import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexXAxis,
  ApexPlotOptions,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive
} from 'ng-apexcharts';
import { DashboardService } from '../services/dashboard.service';
import { Notyf } from 'notyf';
import { MasterService } from '../services/master.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../services/employee.service';
import Swal from 'sweetalert2';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  colors?: string[];
};

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  responsive: ApexResponsive[];
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule, NgApexchartsModule, CommonModule, NgSelectModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  [x: string]: any;
  @ViewChild('chart') chart: ChartComponent | undefined;
  @ViewChild('attendanceDonutChart') attendanceDonutChart: ChartComponent | undefined;

  notyf: Notyf = new Notyf();
  public chartOptions!: Partial<ChartOptions>;
  public attendanceDonutOptions!: Partial<DonutChartOptions>;

  branchList: any;
  obj: any = {};
  stats: any[] = [];
  employeeList: any[] = [];
  holidayList: any[] = [];
  leaveList: any[] = [];
  leaveTypes: any[] = [];
  trackingList: any[] = [];
  birthdays: any[] = [];
  anniversaries: any[] = [];
  attendanceChart: any = null;
  attendanceByDepartment: any[] = [];
  baseurl: any;
  Event: any = [];
  selectedEmployeeTableRange = 'This Week';
  selectedAttendanceChartRange = 'This Week';
  selectedAttendanceDepartmentRange = 'This Week';
  activeEmployeeSectionTab: 'employee' | 'leave' = 'employee';
  isEmployeeTableRangeOpen = false;
  isAttendanceChartRangeOpen = false;
  isAttendanceDepartmentRangeOpen = false;

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    public masterService: MasterService,
    private employeeService: EmployeeService
  ) {
    this.getBranchDD();
  }

  ngOnInit(): void {
    this.baseurl = this.masterService.getBaseUrl();
    this.resetDashboardState();
    this.loadDashboard();
  }

  resetDashboardState() {
    this.stats = [];
    this.Event = [];
    this.employeeList = [];
    this.chartOptions = {};
    this.attendanceDonutOptions = {};
    this.holidayList = [];
    this.leaveList = [];
    this.leaveTypes = [];
    this.trackingList = [];
    this.birthdays = [];
    this.anniversaries = [];
    this.attendanceChart = null;
    this.attendanceByDepartment = [];
  }

  loadDashboard() {
    const dashboardRange = this.activeEmployeeSectionTab === 'leave' ? this.selectedEmployeeTableRange : 'All';

    this.dashboardService.getDashboardData(dashboardRange, this.activeEmployeeSectionTab).subscribe({
      next: (res: any) => {
        if (res.status === true) {
          this.stats = res.data.stats || [];
          this.chartOptions = res.data.chartOptions || {};
          this.employeeList = res.data.employees || [];
          this.leaveList = res.data.leaves || [];
          this.leaveTypes = res.data.leaveMasterList || [];
          this.holidayList = (res.data.holidays || []).map((item: any) => ({
            ...item,
            image: item?.image ? `${this.baseurl}/${item.image}` : 'assets/img/avatars/calendar.png'
          }));
          this.trackingList = res.data.trackingList || [];
          this.birthdays = res.data.birthdays || [];
          this.anniversaries = res.data.anniversaries || [];
          this.attendanceChart = res.data.attendanceChart || null;
          this.attendanceByDepartment = res.data.attendanceByDepartment || [];
          this.Event = res.data;
          this.setAttendanceDonutChart();
          return;
        }

        if (res.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }

        this.notyf.error(res.message || 'Something went wrong');
        this.resetDashboardState();
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Unable to load dashboard');
        this.resetDashboardState();
      }
    });
  }

  setAttendanceDonutChart() {
    if (!this.attendanceChart?.series?.length) {
      this.attendanceDonutOptions = {};
      return;
    }

    this.attendanceDonutOptions = {
      series: this.attendanceChart.series,
      chart: {
        type: 'donut',
        height: 100
      },
      labels: this.attendanceChart.labels || [],
      colors: this.attendanceChart.colors || [],
      dataLabels: {
        enabled: false
      },
      legend: {
        show: false
      },
      plotOptions: {
        pie: {
          donut: {
            size: '68%'
          }
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 100
            }
          }
        }
      ]
    };
  }

  getStatValue(index: number): string {
    return this.stats[index]?.value || '0';
  }

  getStat(title: string): any {
    return this.stats.find((item: any) => item.title === title) || null;
  }

  getStatValueByTitle(title: string): string {
    return this.getStat(title)?.value || '0';
  }

  getStatChange(title: string): string {
    return this.getStat(title)?.change || '';
  }

  getStatChangeLabel(title: string): string {
    return this.getStat(title)?.changeLabel || '';
  }

  getStatMicroLabel(title: string, fallback: string): string {
    const label = String(this.getStatChangeLabel(title) || '').trim();
    return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : fallback;
  }

  getStatChangeClass(title: string): string {
    const direction = String(this.getStat(title)?.changeDirection || '').toLowerCase();

    if (direction === 'down') {
      return 'text-danger';
    }

    if (direction === 'warning') {
      return 'text-warning';
    }

    return 'text-success';
  }

  getStatChangeIcon(title: string): string {
    const direction = String(this.getStat(title)?.changeDirection || '').toLowerCase();

    if (direction === 'down') {
      return 'ri-arrow-down-s-fill';
    }

    if (direction === 'warning') {
      return 'ri-subtract-line';
    }

    return 'ri-arrow-up-s-fill';
  }

  getAttendanceBreakdown(label: string): string {
    return this.attendanceChart?.breakdown?.find((item: any) => item.label === label)?.value || '0%';
  }

  getAttendanceTrendLabel(label: string): string {
    const normalizedLabel = String(label || '').toLowerCase();

    if (normalizedLabel === 'present') {
      return 'Up';
    }

    if (normalizedLabel === 'on leave') {
      return 'Less';
    }

    if (normalizedLabel === 'on emergency leave') {
      return 'Often';
    }

    return '';
  }

  get onlineTrackingCount(): number {
    return this.trackingList.filter((item: any) => item.status === 'live').length;
  }

  get offlineTrackingCount(): number {
    return this.trackingList.filter((item: any) => item.status !== 'live').length;
  }

  get celebrationsList(): any[] {
    return [
      ...this.birthdays.map((item: any) => ({
        ...item,
        cardTitle: 'Birthday',
        dateLabel: item?.dateOfBirth ? new Date(item.dateOfBirth).toLocaleDateString('en-GB') : 'NA'
      })),
      ...this.anniversaries.map((item: any) => ({
        ...item,
        cardTitle: 'Anniversary',
        dateLabel: item?.joiningDate ? new Date(item.joiningDate).toLocaleDateString('en-GB') : 'NA'
      }))
    ].slice(0, 2);
  }

  onImageError(event: Event, data: any, imageType: string) {
    if (imageType === 'holidayImage') {
      const img = event.target as HTMLImageElement;
      img.src = 'assets/img/avatars/calendar.png';
      return;
    }

    const img = event.target as HTMLImageElement;
    img.src = data?.gender === 'Male' ? 'assets/img/avatars/5.png' : 'assets/img/avatars/4.png';
  }

  getEmployeeAvatar(item: any): string {
    return item?.profileImage || (item?.gender === 'Male' ? 'assets/img/avatars/5.png' : 'assets/img/avatars/4.png');
  }

  getLeaveStatusClass(status: string): string {
    const normalizedStatus = String(status || '').toLowerCase();

    if (normalizedStatus === 'approved') {
      return 'bg-label-success';
    }

    if (normalizedStatus === 'rejected') {
      return 'bg-label-danger';
    }

    return 'bg-label-warning';
  }

  onBranchChange(branchId: any) {
    localStorage.setItem('branchId', branchId);
  }

  openEmployeeListPage() {
    this.router.navigate(['/layout/employee/joining']);
  }

  openLeaveListPage() {
    this.router.navigate(['/layout/employee/apply-leave']);
  }

  openHolidayPage() {
    this.router.navigate(['/layout/attendance/holiday']);
  }

  openCelebrationPage() {
    this.router.navigate(['/layout/employee/joining']);
  }

  setEmployeeSectionTab(tab: 'employee' | 'leave') {
    this.activeEmployeeSectionTab = tab;
    this.loadDashboard();
  }

  openEmployeeProfile(item: any) {
    this.employeeService.getEmp().subscribe({
      next: (response: any) => {
        if (response?.status !== true) {
          this.notyf.error(response?.message || 'Unable to open employee profile');
          return;
        }

        const formattedEmployees = response?.data?.formattedEmps || [];
        const selectedEmployee =
          formattedEmployees.find((employee: any) => employee.empCode === item?.empCode) ||
          formattedEmployees.find((employee: any) =>
            `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() === item?.name
          );

        if (!selectedEmployee) {
          this.notyf.error('Selected employee data was not found');
          return;
        }

        localStorage.setItem('employeeId', JSON.stringify(selectedEmployee));
        this.router.navigate(['/layout/employee/add/profile/professional-info/assign-leave']);
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Unable to open employee profile');
      }
    });
  }

  openLeaveApproval(item: any) {
    this.confirmLeaveStatusChange(item, 'approved');
  }

  rejectLeaveApproval(item: any) {
    this.confirmLeaveStatusChange(item, 'rejected');
  }

  confirmLeaveStatusChange(item: any, status: 'approved' | 'rejected') {
    const actionLabel = status === 'approved' ? 'approve' : 'reject';

    Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${actionLabel} this leave request?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: status === 'approved' ? 'Yes, approve it' : 'Yes, reject it',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.updateLeaveStatus(item, status);
      }
    });
  }

  updateLeaveStatus(item: any, status: 'approved' | 'rejected') {
    const payload = {
      ...item,
      status
    };

    this.masterService.UpdateApplyLeaveStatus(payload).subscribe({
      next: (response: any) => {
        if (response?.status === true) {
          this.notyf.success(response?.message || `Leave ${status} successfully`);
          this.loadDashboard();
          return;
        }

        if (response?.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }

        this.notyf.error(response?.message || `Unable to ${status} leave`);
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || `Unable to ${status} leave`);
      }
    });
  }

  setEmployeeTableRange(range: string) {
    this.selectedEmployeeTableRange = range;
    this.isEmployeeTableRangeOpen = false;
    this.loadDashboard();
  }

  toggleEmployeeTableRangeDropdown(event: Event) {
    event.stopPropagation();
    this.isEmployeeTableRangeOpen = !this.isEmployeeTableRangeOpen;
    this.isAttendanceChartRangeOpen = false;
    this.isAttendanceDepartmentRangeOpen = false;
  }

  loadAttendanceChart() {
    this.dashboardService.getAttendanceChart(this.selectedAttendanceChartRange).subscribe({
      next: (res: any) => {
        if (res.status === true) {
          this.attendanceChart = res.data || null;
          this.setAttendanceDonutChart();
          return;
        }

        if (res.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }

        this.notyf.error(res.message || 'Unable to load attendance chart');
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Unable to load attendance chart');
      }
    });
  }

  setAttendanceChartRange(range: string) {
    this.selectedAttendanceChartRange = range;
    this.isAttendanceChartRangeOpen = false;
    this.loadAttendanceChart();
  }

  toggleAttendanceChartRangeDropdown(event: Event) {
    event.stopPropagation();
    this.isAttendanceChartRangeOpen = !this.isAttendanceChartRangeOpen;
    this.isEmployeeTableRangeOpen = false;
    this.isAttendanceDepartmentRangeOpen = false;
  }

  loadAttendanceByDepartment() {
    this.dashboardService.getAttendanceByDepartment(this.selectedAttendanceDepartmentRange).subscribe({
      next: (res: any) => {
        if (res.status === true) {
          this.attendanceByDepartment = res.data || [];
          return;
        }

        if (res.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }

        this.notyf.error(res.message || 'Unable to load attendance by department');
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Unable to load attendance by department');
      }
    });
  }

  setAttendanceDepartmentRange(range: string) {
    this.selectedAttendanceDepartmentRange = range;
    this.isAttendanceDepartmentRangeOpen = false;
    this.loadAttendanceByDepartment();
  }

  toggleAttendanceDepartmentRangeDropdown(event: Event) {
    event.stopPropagation();
    this.isAttendanceDepartmentRangeOpen = !this.isAttendanceDepartmentRangeOpen;
    this.isEmployeeTableRangeOpen = false;
    this.isAttendanceChartRangeOpen = false;
  }

  @HostListener('document:click')
  closeDropdowns() {
    this.isEmployeeTableRangeOpen = false;
    this.isAttendanceChartRangeOpen = false;
    this.isAttendanceDepartmentRangeOpen = false;
  }
  gotoTrackingPage(){
    this.router.navigate(['/layout/tracking']);
  }

  getBranchDD() {
    this.branchList = [];
    this.masterService.BranchDD().subscribe((res) => {
      if (res.status === true) {
        this.branchList = res.data;
      } else if (res.status === 'expired') {
        this.router.navigate(['login']);
      } else {
        this.notyf.error(res.message || 'Something went wrong');
      }
    });
  }
}
