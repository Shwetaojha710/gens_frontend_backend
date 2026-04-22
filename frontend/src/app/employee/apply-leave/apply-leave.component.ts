import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import { MessagingService } from '../../services/messaging.service';

@Component({
  selector: 'app-apply-leave',
  imports: [NgSelectModule,
    FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './apply-leave.component.html',
  styleUrl: './apply-leave.component.css'
})

export class ApplyLeaveComponent {
  obj: any = {}
  notyf: Notyf;

  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]
  leaveStatus: any = [{ value: 'pending', label: 'Pending' },{ value: 'recommended', label: 'Recommended' },{ value: 'self_declined', label: 'Self Declined' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  EmployeeForm!: FormGroup;
  EmployeeList = [];
  editingId: number | null = null;
  minDate: any
  constructor(
    private fb: FormBuilder,
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
    public messagingService: MessagingService
  ) {
    this.EmployeeForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
  }
  // This will return either today (for "from date") or selected fromDate (for "to date")
  getToDateMin(): string {
    return this.obj['fromDate'] || this.minDate;
  }
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
  yearList: any = [];
  async ngOnInit() {
    this.EmployeeForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
    await this.getApplyLeaveList()
    await this.getLeaveTypeList()
    await this.empList()

    await this.messagingService.initMessaging();
    const token = await this.messagingService.requestPermission();
    console.log('FCM Token after init:', token);
          await this.getYear()
    const year = new Date().getFullYear()
   this.obj['year'] = this.yearList.find((item: any) => item.value == year);
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
  //   async enableNotifications() {
  //       await  this.messagingService.listen();
  //   const token = await this.messagingService.requestPermission();
  //   if (token) {
  //     console.log('Send this token to backend:', token);

  //     // Call your backend API to save this token
  //     // Example using HttpClient:
  //     // this.http.post(`${environment.apiUrl}/saveDeviceToken`, { token, userId }).subscribe();
  //   }
  // }
  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;
  // onSearch(term: string) {
  //   if (!term) {
  //     this.getApplyLeaveList()
  //   } else {
  //     this.searchTerm = term.toLowerCase();
  //     this.currentPage = 1;
  //     this.applyFilters();
  //   }

  // }
  onSearch(term: string) {
    if (!term) {
      this.searchText = ''
      this.getApplyLeaveList()
    } else {
      this.searchTerm = term.toLowerCase();
      this.currentPage = 1;
      this.applyFilters();
    }

    // this.loadEmployees()
  }

  // onPageChange(page: number) {
  //   this.currentPage = page;
  //   this.applyFilters();
  // }


  // onPageSizeChange(size: number) {
  //   this.pageSize = size;
  //   this.currentPage = 1;
  //   this.applyFilters();
  // }
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


    // let data = [...this.applyLeaveList];
    //   const value = this.searchTerm || '';
    //   this.searchText = value.trim();

    //   if (this.searchText === '') {
    //     this.applyLeaveList = [...this.originalList];
    //   } else {
    //     this.applyLeaveList = this.originalList.filter((item: any) =>
    //       JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
    //     );
    //   }


    //   // // pagination
    //   // const start = (this.currentPage - 1) * this.pageSize;
    //   // const end = start + this.pageSize;
    //   // this.applyLeaveList = data.slice(start, end);
    //     // pagination
    //   const start = (this.currentPage - 1) * this.pageSize;
    //   const end = start + this.pageSize;
    //   this.filteredDesignation = data.slice(start, end);




    let data = [...this.applyLeaveList];
    const value = this.searchTerm || '';
    this.searchText = value.trim();
    if (this.searchText === '') {
      this.applyLeaveList = [...this.originalList];
    } else {
      this.applyLeaveList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
    // pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredDesignation = data.slice(start, end);

  }
  applyLeaveList: any = []
  originalList: any = []
  async getApplyLeaveList() {
    this.applyLeaveList = []
    this.originalList = []
     this.filteredDesignation = []
    this.master.getapplyLeaveList(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {


          // this.notyf.success(message)
          this.applyLeaveList = response.data
          this.originalList = response.data
          // pagination
          const start = (this.currentPage - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.filteredDesignation = this.applyLeaveList.slice(start, end);
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



  EmpList: any = []
  async empList() {
    this.EmpList = []
    this.master.getemployeeList().subscribe((data: { [x: string]: any; data: any; }) => {
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        // data.data.shift();
        this.EmpList = data.data;

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    });

  }

  onSubmit() {
    // if (!ValidationUtil.showRequiredError('Employment Type', this.obj.name, this.notyf)) {
    //   return;
    // }
    // this.obj['employeeId']=

    this.master.ApplyLeave(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.getApplyLeaveList();
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

          result.dismiss === Swal.DismissReason.cancel
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

          if (status === true) {

            this.notyf.success(message)
            this.getApplyLeaveList();
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
          this.getApplyLeaveList();
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
        this.deleteemployee(data)
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
  deleteemployee(data: any) {
    this.master.deleteEmployee(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.getApplyLeaveList();
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
  isInvalid(field: string): boolean {
    const control = this.EmployeeForm.get(field);
    return !!(control && control.touched && control.invalid);
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
