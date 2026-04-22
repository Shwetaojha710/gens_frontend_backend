import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { AttendanceService } from '../../services/attendance.service';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
@Component({
  selector: 'app-logs',
  imports: [FormsModule, CommonModule, NgSelectModule,],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})

export class LogsComponent {
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

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }
  onItemsPerPageChange(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1; // Reset to first page
    this.updateDisplayedList();
  }
  dayList: string[] = [];
  ExportDayList: string[] = [];


  generateDayList(month: number, year: number) {
  const today = new Date();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // JS month is 0-based
  const currentDate = today.getDate();

  const totalDaysInMonth = new Date(year, month, 0).getDate(); // month is 1-based

  // decide how many days to show
  let daysInMonth = totalDaysInMonth;

  // if current month selected → show till today only
  if (year == currentYear && month == currentMonth) {
    daysInMonth = currentDate;
  }

  this.dayList = [];
  this.ExportDayList = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const day = i.toString().padStart(2, '0');
      const date = new Date(year, month - 1, i); // month-1 because Date expects 0-based month
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Mon", "Tue"
      this.dayList.push(`${day} ${weekday}`);
      this.ExportDayList.push(`${day}`);
    }

    console.log(this.dayList);
    console.log(this.ExportDayList);
  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  AttendanceMasterList: any = [];
  editingId: number | null = null;

  constructor(
    private master: MasterService,
    private attendanceService: AttendanceService,
    public statusService: StatusService,
    private router: Router,
  ) {


    this.notyf = new Notyf();
    this.obj['emp_id'] = 'All'
    this.obj['year'] = new Date().getFullYear().toString()
    this.obj['month'] = new Date().getMonth() + 1 < 10 ? '0' + (new Date().getMonth() + 1) : (new Date().getMonth() + 1).toString()
    this.fetchAttendance()
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
    this.updateDisplayedList();
  }
  applyFilter(event: any) {
    const value = event?.target?.value || '';
    this.searchText = value.trim();

    if (this.searchText === '') {
      this.AttendanceMasterList = [...this.originalList];
    } else {
      this.AttendanceMasterList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }

    // this.updateDisplayedList();
  }

  // applyFilter(event: any) {
  //   this.searchText = event?.target.value;

  //   if (!this.searchText || this.searchText.trim() === '') {
  //     this.AttendanceMasterList = [...this.originalList];
  //       this.updateDisplayedList();
  //     return;
  //   }

  //   const search = this.searchText.toLowerCase();

  //   this.AttendanceMasterList = this.originalList.filter((item: any) => {
  //     return (
  //       item.employee_name.toLowerCase().includes(search) ||
  //       item.data.some((d: any) =>
  //         d.date?.toLowerCase().includes(search) ||
  //         d.status?.toLowerCase().includes(search)
  //       )
  //     );
  //   });
  //   this.currentPage = 1;
  // }
  async ngOnInit() {

    await this.empList();
    await this.getYear();
    this.updateDisplayedList();
  }
  fetchAttendance() {
    this.AttendanceList = [];
    this.originalList = [];

    this.attendanceService.getattendancelist(this.obj).subscribe(
      (response: any) => {
        if (response && response.status === true && response.data) {

          this.notyf.success(response.message || 'Employees loaded successfully');

          this.AttendanceMasterList = response.data || [];

          this.generateDayList(this.obj.month, this.obj.year);

          // 3️⃣ Status mapping
          const statusMap: Record<string, string> = {
            'Week Off': 'WO',
            'Present': 'P',
            'Absent': 'A',
            'On Leave': 'L',
            'Holiday': 'H',
            'First Half': 'FH',
            'Second Half': 'H',
          };

          this.AttendanceMasterList = this.AttendanceMasterList.map((item: any) => ({
            ...item,
            data: item.data.map((item1: any) => ({
              ...item1,
              status: statusMap[item1.status] || item1.status
            }))
          }));

          this.AttendanceMasterList.forEach((employee: any) => {

            employee.dayTime = {};

            this.dayList.forEach(day => {

              const dayNum = day.slice(0, 2);

              const match = employee.data.find((entry: any) =>
                entry.date.endsWith(`-${dayNum}`)
              );

              //s Format Time Function
              const formatTime = (dateTime: string) => {
                if (!dateTime) return '';
                return new Date(dateTime)
                  .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

              };

              let checkInTime = formatTime(match?.checkIn);
              let checkOutTime = formatTime(match?.checkOut);
              if (checkOutTime == "Invalid Date") {
                checkOutTime = '00:00'
              }
              if (checkInTime == "Invalid Date") {
                checkInTime = '00:00'
              }
              // Present
              if (checkInTime || checkOutTime) {
                employee.dayTime[day] = `${checkInTime} - ${checkOutTime}`;
              }

              // Week Off
              else if (match?.status == 'WO') {
                employee.dayTime[day] = 'WO';
              }

              // Absent
              else if (match?.status == 'A') {
                employee.dayTime[day] = 'A';
              }
              else if (match?.status == 'H') {
                employee.dayTime[day] = 'H';
              }
              else if (match?.status == 'L') {
                employee.dayTime[day] = 'L';
              }
              else if (match?.status == 'FH') {
                employee.dayTime[day] = 'FH';
              }
              else if (match?.status == 'SH') {
                employee.dayTime[day] = 'SH';
              }

              else {
                employee.dayTime[day] = '--';
              }

            });

          });




          // this.AttendanceMasterList.forEach((employee: any) => {
          //   employee.dayTime = {};

          //   this.dayList.forEach(day => {
          //     const dayNum = day.slice(0, 2);

          //     const match = employee.data.find((entry: any) =>
          //       entry.date.endsWith(`-${dayNum}`)
          //     );

          //     const checkInTime  = match?.checkIn?.split(' ')[1];
          //     const checkOutTime = match?.checkOut?.split(' ')[1];

          //     employee.dayTime[day] =
          //       checkInTime && checkOutTime
          //         ? `${checkInTime} - ${checkOutTime}`
          //         : '';
          //   });
          // });



          this.originalList = this.AttendanceMasterList;

          this.updateDisplayedList();

        } else if (response.status === false) {
          this.notyf.error(response.message);
        } else if (response.status === 'expired') {
          this.AttendanceMasterList = [];
          this.router.navigate(['login']);
        }
      },
      (error: any) => {
        this.AttendanceMasterList = [];
        console.error('Error loading employees:', error);
        this.notyf.error(error?.error?.message);
      }
    );
  }


  //   fetchAttendance() {
  //     this.AttendanceList = []
  //     this.originalList = []
  //     console.log(this.AttendanceMasterList, "attendace master list 111")
  //     this.attendanceService.getattendancelist(this.obj).subscribe((response: any) => {
  //       if (response && response.data && response.status === true) {
  //         this.notyf.success(response.message || 'Employees loaded successfully');
  //         this.AttendanceMasterList = [];
  //         this.AttendanceMasterList = response.data || [];
  //         const statusMap: Record<string, string> = {
  //           'Week Off': 'WO',
  //           'Present': 'P',
  //           'Absent': 'A'
  //         };
  //         // 1️⃣ Map status text
  // this.AttendanceMasterList = this.AttendanceMasterList.map((item: any) => ({
  //   ...item,
  //   data: item.data.map((item1: any) => ({
  //     ...item1,
  //     status: statusMap[item1.status] || item1.status
  //   }))
  // }));

  // // 2️⃣ Add dayTime object
  // this.AttendanceMasterList.forEach((employee: any) => {
  //   employee.dayTime = {};

  //   this.dayList.forEach(day => {
  //     const dayNum = day.slice(0, 2);

  //     const match = employee.data.find((entry: any) =>
  //       entry.date.endsWith(`-${dayNum}`)
  //     );

  //     const checkInTime  = match?.checkIn?.split(' ')[1];
  //     const checkOutTime = match?.checkOut?.split(' ')[1];

  //     employee.dayTime[day] =
  //       checkInTime && checkOutTime
  //         ? `${checkInTime} - ${checkOutTime}`
  //         : '';
  //   });
  // });

  // // Optional
  // this.originalList = this.AttendanceMasterList;

  // console.log(this.AttendanceMasterList);

  // //         this.AttendanceMasterList = this.AttendanceMasterList.map((item: any) => ({
  // //           ...item,
  // //           data: item.data.map((item1: any) => ({
  // //             ...item1,
  // //             status: statusMap[item1.status] || item1.status
  // //           }))
  // //         }));

  // //        this.AttendanceMasterList= this.AttendanceMasterList.forEach((employee: any) => {
  // //   employee.dayTime = {};

  // //   this.dayList.forEach(day => {
  // //     const dayNum = day.slice(0, 2);

  // //     const match = employee.data.find((entry: any) =>
  // //       entry.date.endsWith(`-${dayNum}`)
  // //     );

  // //     const checkInTime  = match?.checkIn?.split(' ')[1];
  // //     const checkOutTime = match?.checkOut?.split(' ')[1];

  // //     if (checkInTime && checkOutTime) {
  // //       employee.dayTime[day] = `${checkInTime} - ${checkOutTime}`;
  // //     } else {
  // //       employee.dayTime[day] = ''; // A / WO
  // //     }
  // //   });
  // // });
  // //   this.originalList = this.AttendanceMasterList
  //         this.generateDayList(this.obj['month'], this.obj['year']);
  //         this.updateDisplayedList();
  //       } else if (response.status === false) {
  //         this.notyf.error(response.message)
  //       }
  //       else if (response.status == 'expired') {
  //         this.AttendanceMasterList = [];
  //         this.router.navigate(['login'])
  //       }
  //     },
  //       (error: any) => {
  //         this.AttendanceMasterList = [];
  //         console.error('Error loading employees:', error);
  //         this.notyf.error(error)
  //         // alert('Failed to load employees. Please try again.');
  //       }
  //     );

  //   }

  export(): void {

    const exportData: any[] = [];
    const columnOrder = ['Employee', 'EmpCode', ...this.ExportDayList];

    this.originalList.forEach((employee: any) => {

      const row: any = {};

      // fixed columns
      row['Employee'] = employee.employee_name;
      row['EmpCode'] = employee.empCode;

      this.ExportDayList.forEach(day => {

        const dayNum = day.slice(0, 2);

        const match = employee.data.find((entry: any) =>
          entry.date.endsWith(`-${dayNum}`)
        );

        const formatTime = (dateTime: string) => {
          if (!dateTime) return '';
          return new Date(dateTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        };

        let checkInTime = formatTime(match?.checkIn);
        let checkOutTime = formatTime(match?.checkOut);
        if (checkOutTime == "Invalid Date") {
          checkOutTime = '00:00'
        }
        if (checkInTime == "Invalid Date") {
          checkInTime = '00:00'
        }
             if (checkInTime || checkOutTime) {
                row[day] = `${checkInTime} - ${checkOutTime}`;
              }

              // Week Off
              else if (match?.status == 'WO') {
                row[day] = 'WO';
              }

              // Absent
              else if (match?.status == 'A') {
                row[day] = 'A';
              }
              else if (match?.status == 'H') {
                row[day] = 'H';
              }
              else if (match?.status == 'L') {
                row[day] = 'L';
              }
              else if (match?.status == 'FH') {
                row[day] = 'FH';
              }
              else if (match?.status == 'SH') {
                row[day] = 'SH';
              }

              else {
                row[day] = '--';
              }
        // if (checkInTime || checkOutTime) {
        //   row[day] = `${checkInTime} ${checkOutTime}`;
        // }
        // else if (match?.status == 'WO') {
        //   row[day] = 'WO';
        // }
        // else if (match?.status == 'A') {
        //   row[day] = 'A';
        // }
        // else {
        //   row[day] = '--';
        // }

      });

      exportData.push(row);

    });

    const sheetData = [
      columnOrder,
      ...exportData.map(row => columnOrder.map(col => row[col]))
    ];

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(sheetData);

    const workbook: XLSX.WorkBook = {
      Sheets: { Attendance: worksheet },
      SheetNames: ['Attendance']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(blob, 'Monthly_Attendance.xlsx');

  }



  //   export(): void {
  //     const exportData: any[] = [];

  //     this.originalList.forEach((employee: any) => {
  //       const row: any = {};
  //       row['Employee'] = employee.employee_name;

  //       this.dayList.forEach(day => {
  //   const dayNum = day.slice(0, 2); // "01", "02", ...
  //   const match = employee.data.find((entry: any) =>
  //     entry.date.endsWith(`-${dayNum}`)
  //   );

  //   row[day] = {
  //     status: this.mapStatus(match?.status || ''),
  //     checkIn: match?.checkIn || '',
  //     checkOut: match?.checkOut || ''
  //   };
  // });


  //       // this.dayList.forEach(day => {
  //       //   const dayNum = day.slice(0, 2); // "01", "02", ...
  //       //   const match = employee.data.find((entry: any) =>
  //       //     entry.date.endsWith(`-${dayNum}`)
  //       //   );

  //       //   row[day] = this.mapStatus(match?.status || '');
  //       //   row[day] =match?.checkIn
  //       //   row[day] =match?.checkOut
  //       // });

  //       exportData.push(row);
  //     });

  //     const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
  //     const workbook: XLSX.WorkBook = {
  //       Sheets: { 'Attendance': worksheet },
  //       SheetNames: ['Attendance']
  //     };

  //     const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  //     const blob = new Blob([excelBuffer], {
  //       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  //     });

  //     FileSaver.saveAs(blob, 'Monthly_Attendance.xlsx');
  //   }

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
        // console.log(this.EmpList, "attendance master list");

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





}

