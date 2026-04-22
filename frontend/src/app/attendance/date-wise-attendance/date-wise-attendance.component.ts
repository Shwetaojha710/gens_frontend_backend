import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import FileSaver from 'file-saver';
import { Notyf } from 'notyf';
import { AttendanceService } from '../../services/attendance.service';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import * as XLSX from 'xlsx';
import id from '@angular/common/locales/id';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-date-wise-attendance',
  imports: [FormsModule, CommonModule, NgSelectModule,],
  templateUrl: './date-wise-attendance.component.html',
  styleUrl: './date-wise-attendance.component.css'
})

export class DateWiseAttendanceComponent {
  obj: any = {}
  notyf: Notyf;
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

  checkUncheckAll() {
    this.AttendanceMasterList.forEach((item: any) => item.editable = this.masterSelected);
  }
  masterSelected: boolean = false;

  isAllSelected() {
    this.masterSelected = this.AttendanceMasterList.every((item: any) => item.editable);

  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }
  onItemsPerPageChange(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1; // Reset to first page
    this.updateDisplayedList();
  }
  dayList: string[] = [];

  generateDayList(startDate: string | Date, endDate: string | Date): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    this.dayList = [];

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      console.error('Invalid date range');
      return;
    }

    let current = new Date(start);

    while (current <= end) {
      const day = current.getDate().toString().padStart(2, '0');
      const month = (current.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
      const year = current.getFullYear();
      const weekday = current.toLocaleDateString('en-US', { weekday: 'short' });
      this.dayList.push(`${day} ${month} ${weekday}`);


      current.setDate(current.getDate() + 1);
    }

    console.log(this.dayList);
  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  AttendanceMasterList: any = [];
  editingId: number | null = null;
  minDate: any
  fromDashboard: any = 'false'
  constructor(
    private master: MasterService,
    private attendanceService: AttendanceService,
    public statusService: StatusService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Check if we came from the dashboard, e.g., via a query param
    this.fromDashboard = this.route.snapshot.queryParamMap.get('fromDashboard');
    const today1 = new Date();
    if (this.fromDashboard == 'true') {
      this.obj['emp_id'] = 'All';

      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');

      this.obj['startDate'] = `${year}-${month}-${day}`;
      this.obj['endDate'] = `${year}-${month}-${day}`;
      this.fetchAttendance();


    } else {
      this.fromDashboard = 'false'
    }
    this.minDate = today1.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
  }
  setMinToDate() {
    if (this.obj['startDate']) {
      const fromDate = new Date(this.obj['startDate']);

      if (!isNaN(fromDate.getTime())) {  // ✅ valid date check
        this.minDate = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }

  }
  getToDateMin(): string {
    return this.newObj['startDate'] || this.minDate;
  }
  yearList: any = [];
  EmpList: any = []
  AttendanceList: any = []
  searchText: any
  originalList: any = []
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  updateDisplayedList() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    this.AttendanceMasterList = this.originalList.slice(start, end);
    this.totalPages = Math.ceil(this.originalList.length / this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateVisiblePages();
    this.updateDisplayedList();
  }
  applyFilter(event: any) {
    this.searchText = event?.target.value;

    if (!this.searchText || this.searchText.trim() === '') {
      this.AttendanceMasterList = [...this.originalList];
      this.updateDisplayedList();
      return;
    }

    const search = this.searchText.toLowerCase();

    this.AttendanceMasterList = this.originalList.filter((item: any) => {
      return (
        item.employee_name.toLowerCase().includes(search) ||
        (item.date && item.date.toLowerCase().includes(search)) ||
        (item.status && item.status.toLowerCase().includes(search)) ||
        (item.checkIn && item.checkIn.toLowerCase().includes(search)) ||
        (item.checkOut && item.checkOut.toLowerCase().includes(search))
      );
    });

    this.currentPage = 1;
    // this.updateDisplayedList();
  }

  async ngOnInit() {

    await this.empList();
    await this.getYear();
    this.updateDisplayedList();
    this.updateVisiblePages();

  }

  fetchAttendance() {
    this.AttendanceList = []
    this.originalList = []
    // console.log(this.AttendanceMasterList, "Attendance master list 111")
    this.attendanceService.getdateWiseAttendance(this.obj).subscribe((response: any) => {

      let message = response.message ? response.message : 'Data found Successfully';
      let status = this.statusService.handleResponseStatus(response.status, message);
      if (status == true) {
        this.notyf.success(response.message || 'Employees loaded successfully');
        this.AttendanceMasterList = [];
        this.AttendanceMasterList = response.data || [];
        const statusMap: Record<string, string> = {
          'Week Off': 'WO',
          'Present': 'P',
          'Absent': 'A'
        };
        this.AttendanceMasterList = this.AttendanceMasterList.map((item: any) => ({
          ...item,
          status: statusMap[item.status] || item.status

        }));
        this.originalList = this.AttendanceMasterList
        this.generateDayList(this.obj['startDate'], this.obj['endDate']);
        this.updateDisplayedList();
        this.updateVisiblePages()
      } else if (status == false) {
        this.notyf.error(response.message)
      }
      else if (status == 'expired') {
        this.AttendanceMasterList = [];
        this.router.navigate(['login'])
      }
    },
      (error: any) => {
        this.AttendanceMasterList = [];
        console.error('Error loading employees:', error);
        this.notyf.error(error?.error?.message || 'Failed to load employees. Please try again.');
        // alert('Failed to load employees. Please try again.');
      }
    );

  }

  export(): void {
    const exportData: any[] = [];

    this.AttendanceMasterList.forEach((employee: any) => {
      const row: any = {};
      row['Employee'] = employee.employee_name;

      this.dayList.forEach(day => {
        const dayNum = day.slice(0, 2); // "01", "02", ...
        const match = employee.data.find((entry: any) =>
          entry.date.endsWith(`-${dayNum}`)
        );

        row[day] = this.mapStatus(match?.status || '');
      });

      exportData.push(row);
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Attendance': worksheet },
      SheetNames: ['Attendance']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(blob, 'Monthly_Attendance.xlsx');
  }

  mapStatus(status: string): string {
    const map: any = {
      'Present': 'P',
      'Absent': 'A',
      'Leave': 'L',
      'Holiday': 'H',
      'Off Day': 'O',
      'Week Off': 'WO'
    };
    return map[status] || status;
  }

  // Optional: map full status to short code
  getShortStatus(status: string): string {
    const map: any = {
      'Present': 'P',
      'Absent': 'A',
      'Leave': 'L',
      'Holiday': 'H',
      'Off Day': 'O',
      'Week Off': 'WO'
    };
    return map[status] || status;
  }



  async empList() {
    this.EmpList = []
    this.master.getemployeeList().subscribe((data: { [x: string]: any; data: any; }) => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.EmpList = data.data;
        this.EmpList = this.EmpList.filter((item: any) => item.label != 'All')

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    });

  }
  async getYear() {
    this.yearList = []
    this.master.getAttendanceYear().subscribe((data: { [x: string]: any; data: any; }) => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.yearList = data.data;
        console.log(this.EmpList, "attendance master list");

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    });

  }
  getStatusClass(status: any): string {
    switch (status) {
      case 'pending': return 'bg-light-warning';
      case 'cancelled': return 'bg-light-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }


  validateField(value: any, fieldName: string): boolean {
    if (!value || value.toString().trim() === '') {
      this.notyf.error(`Please enter a valid ${fieldName}`);
      return false;
    }
    return true;
  }
  newObj: any = {}
  updateFlag: boolean = false;
  applyUpdate(item: any) {
    //     Swal.fire({
    //       title: "Are you sure?",
    //       text: "Do you Want to Enable this",
    //       icon: "warning",
    //       showCancelButton: true,
    //       confirmButtonText: "Yes, Enable it!",
    //       cancelButtonText: "No, cancel!",
    //       reverseButtons: true
    //     }).then((result) => {
    //       if (result.isConfirmed) {
    //          item.editable = true // toggle enable/disable

    //       } else if (result.dismiss === Swal.DismissReason.cancel) {
    //  item.editable = false
    //       }
    //     });
    item.editable = true
  }

  update(data: any) {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you Want to Update this",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Update it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {

        this.newObj = data;
        this.editingId = data.id;
        this.newObj.checkIn = `${data?.date} ${data?.checkIn}`
        this.newObj.checkOut = `${data?.date} ${data?.checkOut}`
        this.newObj.startDate = new Date(data.startDate);
        this.newObj.endDate = new Date(data.endDate);
        this.generateDayList(this.newObj.startDate, this.newObj.endDate);
        this.UpdateAttendance()
        // Swal.fire({
        //   title: "Deleted!",
        //   text: "Your file has been deleted.",
        //   icon: "success"
        // });
      } else if (result.dismiss === Swal.DismissReason.cancel) {

      }
    });

  }

  openupdate() {
    this.updateFlag = true;

  }

  UpdateAttendance() {
    this.attendanceService.updateAttendance(this.newObj).subscribe((data: {
      [x: string]: any;
    }) => {
      if (data['status'] == true) {
        this.notyf.success(data['message']);
        this.fetchAttendance();
        this.updateFlag = false;
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    },
      (error: any) => {
        this.notyf.error('Failed to update attendance. Please try again.');
      }
    );

  }


  correctAll() {
    const selectedEmployees = this.AttendanceMasterList.filter((item: any) => item.editable);
    if (selectedEmployees.length == 0) {
      this.notyf.error('Please Select CheckBox');
      return;
    }
    this.attendanceService.BulkUpdateAttendance(this.AttendanceMasterList).subscribe((data: {
      [x: string]: any;
    }) => {
      if (data['status'] == true) {
        this.notyf.success(data['message']);
        this.fetchAttendance();
        this.updateFlag = false;
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    },
      (error: any) => {
        this.notyf.error('Failed to update attendance. Please try again.');
      }
    );

  }

  back() {
    this.updateFlag = false;
  }

  delete(id: number) {
    this.attendanceService.deleteAttendance(id).subscribe((data: { [x: string]: any; data: any; }) => {
      if (data['status'] == true) {
        this.notyf.success(data['message']);
        this.AttendanceMasterList = this.AttendanceMasterList.filter((item: any) => item.id !== id);
        this.originalList = this.AttendanceMasterList; // Update original list for filtering
        this.updateDisplayedList();
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      } else {
        this.notyf.error(data['message']);
      }
    })
  }
  visiblePages: number[] = [];
  updateVisiblePages() {
    const chunkSize = 3;
    const startPage = Math.floor((this.currentPage - 1) / chunkSize) * chunkSize + 1;
    const endPage = Math.min(startPage + chunkSize - 1, this.totalPages);

    this.visiblePages = [];
    for (let i = startPage; i <= endPage; i++) {
      this.visiblePages.push(i);
    }
  }


}
