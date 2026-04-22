import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-add-comoff',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './add-comoff.component.html',
  styleUrl: './add-comoff.component.css'
})

export class AddComoffComponent {
  obj: any = {}
  notyf: Notyf;

  back() {
    this.obj = {}
    this.createFlag = false

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
  yearList: any = []
  EmpList: any = []
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
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  departmentForm!: FormGroup;
  departmentList: any[] = [];
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
    private attendanceService: AttendanceService,
  ) {
    this.departmentForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });

    this.notyf = new Notyf();
    // this.obj['employeeId'] = 'All'
    // this.obj['year'] = new Date().getFullYear().toString()
    // this.obj['month'] = new Date().getMonth() + 1 < 10 ? '0' + (new Date().getMonth() + 1) : (new Date().getMonth() + 1).toString()
    // this.fetchAttendance()
  }
  searchText: any = '';
  async ngOnInit() {
    this.departmentForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });

    await this.getYear()
    await this.empList()


    await this.fetchAttendance();
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


  }
  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }
  onItemsPerPageChange(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1; // Reset to first page
    this.fetchAttendance();
  }
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchAttendance();
  }
  getStatusClass(status: any): string {
    switch (status) {
      case 'approved': return 'badge-outline-success';
      case 'pending': return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }
  AttendanceList = []
  AttendanceMasterList: any = []
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
  leaveStatus: any = [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }]

  async fetchAttendance() {
    this.AttendanceList = []
    this.AttendanceMasterList = []
    this.originalList = []
    this.attendanceService.listManuallyCompOff(this.obj).subscribe((response: any) => {
      if (response && response.data && response.status == true) {

        this.notyf.success(response.message || 'Employees loaded successfully');
        this.AttendanceMasterList = [];
        this.AttendanceMasterList = response.data || [];
        const statusMap: Record<string, string> = {
          'Week Off': 'WO',
          'Present': 'P',
          'Absent': 'A'
        };
        console.log(this.AttendanceMasterList);

        // this.AttendanceMasterList = this.AttendanceMasterList.map((item: any) => ({
        //   ...item,
        //   data: item.data.map((item1: any) => ({
        //     ...item1,
        //     status: statusMap[item1.status] || item1.status
        //   }))
        // }));
        this.originalList = this.AttendanceMasterList
        // this.generateDayList(this.obj['month'], this.obj['year']);
        // this.updateDisplayedList();
      } else if (response.status == false) {
        this.notyf.error(response.message)
      }
      else if (response.status == 'expired') {
        this.AttendanceMasterList = [];
        this.router.navigate(['login'])
      }
    },
      (error: any) => {
        this.AttendanceMasterList = [];
        console.error('Error loading employees:', error);
        this.notyf.error(error?.error?.message)
        // alert('Failed to load employees. Please try again.');
      }
    );

  }

  approveAll() {
    const selectedEmployees = this.AttendanceMasterList.filter((item: any) => item.editable);
    if (selectedEmployees.length == 0) {
      this.notyf.error('Please Select CheckBox');
      return;
    }

    this.attendanceService.approveManuallyCompOff(selectedEmployees).subscribe((data: {
      [x: string]: any;
    }) => {
      if (data['status'] == true) {
        this.notyf.success(data['message']);
        this.fetchAttendance();
        // this.updateFlag = false;
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

  statuschange(item: any, status: any) {
    if (status == 'rejected') {
      Swal.fire({
        title: "Are you sure?",
        text: "Do you Want to Reject this",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "No, cancel!",
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.RejectLeave(item, status)

        } else if (

          result.dismiss == Swal.DismissReason.cancel
        ) {

        }
      });

    }
    else {
      let newObj: any = {}
      newObj = Object.assign({}, item)
      // newObj['id']=item.id
      newObj['status'] = status
      // newObj['employeeId']=item.employeeId

      this.master.UpdateApplyLeaveStatus(newObj).subscribe({
        next: (response: any) => {
          console.log('response', response);

          let message = response.message ? response.message : 'Data found Successfully';
          let status = this.statusService.handleResponseStatus(response.status, message);
          console.log(status)
          console.log("response", response);

          if (status == true) {

            this.notyf.success(message)
            this.fetchAttendance();
            // this.resetForm();
          }
          else if (status == "expired") {
            this.router.navigate(["login"]);
          }

          else {
            this.notyf.error(message)
          }

        },
        error: (err) => {
          console.error('Error:', err);
          this.notyf.error(err.error?.message)
        }
      });
    }

  }

  RejectLeave(item: any, status: any) {
    let newObj: any = {}
    newObj = Object.assign({}, item)
    // newObj['id']=item.id
    newObj['status'] = status
    // newObj['employeeId']=item.employeeId

    this.master.UpdateApplyLeaveStatus(newObj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.fetchAttendance();
          // this.resetForm();
        }
        else if (status === "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err.error?.message)
      }
    });
  }

  originalList: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;




  onSubmit() {
    // if (!ValidationUtil.showRequiredError('Employee is required', this.obj.emp_id, this.notyf)) {
    //   return;
    // }
    this.obj['totalDays'] = 1

    this.attendanceService.AddManuallyCompOff(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          // this.fetchCurrency();
          this.resetForm();
        }
        else if (status === "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err?.message)
      }
    });

  }

  resetForm() {
    this.createFlag = false
    this.obj = {}
    this.editingId = null;
    // this.obj['employeeId'] = 'All'
    // this.obj['year'] = new Date().getFullYear().toString()
    // this.obj['month'] = new Date().getMonth() + 1 < 10 ? '0' + (new Date().getMonth() + 1) : (new Date().getMonth() + 1).toString()
    this.fetchAttendance()
  }
  isInvalid(field: string): boolean {
    const control = this.departmentForm.get(field);
    return !!(control && control.touched && control.invalid);
  }
  checkUncheckAll() {
    this.AttendanceMasterList.forEach((item: any) => item.editable = this.masterSelected);
  }
  masterSelected: boolean = false;

  isAllSelected() {
    this.masterSelected = this.AttendanceMasterList.every((item: any) => item.editable);

  }
  createFlag: any = false
  listflag: any = true
  updateFlag: any = false
  opencreate() {
    this.obj = {}
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
  }



}
