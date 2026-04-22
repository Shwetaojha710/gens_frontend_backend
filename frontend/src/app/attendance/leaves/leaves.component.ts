import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';

@Component({
  selector: 'app-leaves',
  imports: [FormsModule, CommonModule, NgSelectModule, SearchPaginationComponent],

  templateUrl: './leaves.component.html',
  styleUrl: './leaves.component.css'
})

export class LeavesComponent {
  obj: any = {}
  notyf: Notyf;

  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]
  paidLeave: any = [{ value: false, label: 'NO' }, { value: true, label: 'YES' }]
  Gender: any = [{ value: 'male', label: 'MALE' }, { value: 'female', label: 'FEMALE' }, { value: 'all', label: 'ALL' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  leaveList: any = [];
  editingId: number | null = null;

  constructor(
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
  ) {


    this.notyf = new Notyf();
  }

  async ngOnInit() {


    await this.fetchLeaveList();
  }
  cr_flag: any = false
  changePaidLeave() {
    if (this.obj['carryForward'] == true) {
      this.cr_flag = true
    } else {
      this.cr_flag = false
    }
  }
  pageSize = 5;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;
  onSearch(term: string) {
    if (!term) {
      this.fetchLeaveList()
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
    this.currentPage = 1;
    this.applyFilters();
  }
  filteredDesignation: any = []
  searchText: any = ''

  applyFilters() {



    const value = this.searchTerm || '';
    this.searchText = value.trim();

    if (this.searchText === '') {
      this.leaveList = [...this.originalList];
    } else {
      this.leaveList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }

    let data = [...this.leaveList];
    // pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.leaveList = data.slice(start, end);
  }

  getStatusClass(status: any): string {
    switch (status) {
      case 'pending': return 'bg-light-warning';
      case 'cancelled': return 'bg-light-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }
  originalList: any = []
  async fetchLeaveList() {
    this.leaveList = []
    this.originalList = []
    this.master.getLeaveList().subscribe(data => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.leaveList = data.data;
        this.originalList = data.data;
        console.log(this.leaveList, "attendance master list");

      } else {
        this.notyf.error(data['message']);
      }
    })
  }
  validateField(value: any, fieldName: string): boolean {
    // Allow boolean false as valid, but disallow undefined, null, '', etc.
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value !== 'boolean' && !value)
    ) {
      this.notyf.error(`Please enter a valid ${fieldName}`);
      return false;
    }
    return true;
  }

  onSubmit() {
    if (
      !this.validateField(this.obj.allowedPerYear, 'Allowed Leave Per Year') ||
      !this.validateField(this.obj.applyBeforeDays, 'Apply Before (in Days)') ||
      !this.validateField(this.obj.carryForward, 'Carry Forward Allowed') ||
      !this.validateField(this.obj.genderRestriction, 'Applicable For') ||
      !this.validateField(this.obj.isPaid, 'isPaid') ||
      !this.validateField(this.obj.leaveCode, 'Leave Code') ||
      !this.validateField(this.obj.leaveName, 'Leave Name') ||

      !this.validateField(this.obj.requiresApproval, 'Requires Approval ')
    ) {
      return;
    }

    this.master.createLeave(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.fetchLeaveList();
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
        this.notyf.error(err.error?.message)
      }
    });

  }

  update(dept: any) {
    this.obj = Object.assign({}, dept)
    this.editingId = this.obj.id;
    this.createFlag = true
    this.updateFlag = true
  }
  updatedata() {
    this.master.updateLeave(this.editingId, this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchLeaveList();
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
        this.notyf.error(err.error.message)
      }



    })

  }

  delete(data: number) {

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
        this.deleteLeaveList(data)
      } else if (
        result.dismiss === Swal.DismissReason.cancel
      ) {

      }
    });



  }
  deleteLeaveList(data: any) {
    this.master.deleteLeave(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchLeaveList();
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
  isInvalid(field: string): any {
    // const control = this.EmployeeForm.get(field);
    // return !!(control && control.touched && control.invalid);
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

