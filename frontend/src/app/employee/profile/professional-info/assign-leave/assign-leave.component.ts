import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { DataService } from '../../../../services/data.service';
import { EmployeeService } from '../../../../services/employee.service';
import { StatusService } from '../../../../services/status.service';
import { MasterService } from '../../../../services/master.service';
import { ValidationUtil } from '../../../../shared/utils/validation.util';

@Component({
  selector: 'app-assign-leave',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './assign-leave.component.html',
  styleUrl: './assign-leave.component.css'
})


export class AssignLeaveComponent {
  obj: any = {}
  notyf: Notyf;
  desigantionList: any = []
  personalDetails: any = []
  constructor(private master: MasterService, public empService: EmployeeService, private router: Router, public statusService: StatusService, public dataService: DataService) {
    this.notyf = new Notyf();

    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
  }
  carryForward: any = [{ value: false, label: 'NO' }, { value: true, label: 'YES' }]
  departmentDD: any = []
  yearList: any = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
   monthList = [
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
    { value: '12', label: 'December' }
  ];

  MonthObj:any={'1':'January','2':'February','3':'March','4':'April','5':'May','6':'June','7':'July','8':'August','9':'September','10':'October','11':'November','12':'December'}
  updateDisplayedList() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    this.LeaveList = this.originalList.slice(start, end);
    this.totalPages = Math.ceil(this.originalList.length / this.itemsPerPage);
  }
  async ngOnInit() {
    await this.fetchAssignLeaveList()
    await this.getYear()
    await this.getLeaveTypeList()
    const year = new Date().getFullYear()
   this.NewObj['year'] = this.yearList.find((item: any) => item.value == year);
  }
  leaveTypeList: any = [];
  async getLeaveTypeList() {
    this.leaveTypeList = []
    this.master.getLeaveTypeList().subscribe((data: { [x: string]: any; data: any; }) => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.leaveTypeList = data.data;

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

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    });

  }
  onLeaveTypeChange(id: any) {
    let newLeave = this.leaveTypeList.filter((item: any) => item.value == id)
    this.obj['totalAssigned'] = newLeave[0]?.['allowedPerYear']
  }
  async back() {
    this.obj = {}
    this.createFlag = false
    await this.fetchAssignLeaveList()
  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

   onSubmit() {
    console.log(this.obj)
     if (!ValidationUtil.showRequiredError('Year', this.obj['year'], this.notyf)) {
      return;
    }
    if (!ValidationUtil.showRequiredError('Leave Type', this.obj['leaveTypeId'], this.notyf)) {
      return;
    }
    if (!ValidationUtil.showRequiredError('Carry Forwarded', this.obj['carryForwarded'], this.notyf)) {
      return;
    }

    this.obj['employeeId'] = this.personalDetails.id
    this.empService.assignedLeave(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {
          this.notyf.success(message)

          this.back()
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
        this.notyf.error(err?.error?.message)
      }
    });

  }
  NewObj: any = {}
  LeaveList: any = []
  async fetchAssignLeaveList() {
    let obj: any = {}
    obj['employeeId'] = this.personalDetails.id
    obj['year'] = this.NewObj['year']
    this.LeaveList = []
    this.originalList = []
    this.empService.getAssignLeaveList(obj).subscribe(data => {
      let message = data.message ? data.message : 'Data found Successfully';
      let status = this.statusService.handleResponseStatus(data.status, message);

      if (status == true) {
        this.LeaveList = []
        // this.notyf.success(data['message']);

        this.LeaveList = data.data;
        this.originalList = this.LeaveList

      } else {
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
  createFlag: any = false
  listflag: any = true
  updateFlag: any = false
  editingId: any;
  searchText: any;
  opencreate() {
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
  }

 async  update(dept: any) {
    await this.getYear()
    await this.getLeaveTypeList()
    this.obj = Object.assign({}, dept)
    this.editingId = this.obj.id;
    this.obj.year=this.obj.year.toString()
    this.createFlag = true
    this.updateFlag = true

  }
  updatedata() {
    this.obj['id'] = this.editingId
    this.obj['employeeId'] = this.personalDetails.id
    this.empService.updateAssignedLeave(this.editingId, this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchAssignLeaveList();
          this.resetForm();
        }
        else if (status === "expired") {
            this.router.navigate(["login"]);
        }
        else {
          this.notyf.error(message)
        }
      },
      error: (err: any) => {
        console.error('Error:', err);
        this.notyf.error(err.error.message)
      }



    })

  }
  resetForm() {
    this.createFlag = false
    this.obj = {}
    this.editingId = null;
  }
  delete(id: any) {


    Swal.fire({
      title: "Are you sure?",
      text: "Do you Want to Delete this",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteexperience(id)
        // Swal.fire({
        //   title: "Deleted!",
        //   text: "Your file has been deleted.",
        //   icon: "success"
        // });
      } else if (
        /* Read more about handling dismissals below */
        result.dismiss === Swal.DismissReason.cancel
      ) {
        // Swal.fire({
        //   title: "Cancelled",
        //   text: "Your imaginary file is safe :)",
        //   icon: "error"
        // });
      }
    });


  }
  deleteexperience(id: any) {
    let obj: any = {}
    obj['id'] = id

    this.empService.deleteAssignLeave(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchAssignLeaveList();
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

    })
  }
  originalList: any = []
  applyFilter(event: any) {
    this.searchText = event?.target.value;

    if (!this.searchText || this.searchText.trim() === '') {
      this.LeaveList = [...this.originalList];
      this.updateDisplayedList();
      return;
    }

    const search = this.searchText.toLowerCase();

    this.LeaveList = this.originalList.filter((item: any) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(search)
      )
    );
    this.currentPage = 1;
  }
  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedList();
  }
  onItemsPerPageChange(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1; // Reset to first page
    this.updateDisplayedList();
  }
}
