import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import { MessagingService } from '../../services/messaging.service';

function calcLeaveDays(
  fromIso: string,
  toIso: string,
  durationType: string,
  toDurationType: string,
): number {
  if (!fromIso || !toIso) return 0;
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  if (Number.isNaN(+from) || Number.isNaN(+to) || to < from) return 0;
  const msDay = 86400000;
  let days = Math.round((+to - +from) / msDay) + 1;
  if (fromIso === toIso) {
    return durationType === 'full' ? 1 : 0.5;
  }
  if (durationType === 'first_half' || durationType === 'second_half') days -= 0.5;
  if (toDurationType === 'first_half' || toDurationType === 'second_half') days -= 0.5;
  return Math.max(0, days);
}

@Component({
  selector: 'app-apply-leave',
  imports: [NgSelectModule,
    FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './apply-leave.component.html',
  styleUrl: './apply-leave.component.css'
})
export class ApplyLeaveComponent {
  obj: any = {
    duration_type: 'full',
    to_duration_type: 'full',
  }
  notyf: Notyf;

  get isSingleLeaveDay(): boolean {
    return !!this.obj?.['fromDate'] && !!this.obj?.['toDate'] && this.obj['fromDate'] === this.obj['toDate'];
  }

  get computedLeaveDays(): number {
    return calcLeaveDays(
      String(this.obj?.['fromDate'] || ''),
      String(this.obj?.['toDate'] || ''),
      String(this.obj?.['duration_type'] || 'full'),
      String(this.obj?.['to_duration_type'] || 'full'),
    );
  }

  get computedLeaveDaysLabel(): string {
    if (!this.obj?.['fromDate'] || !this.obj?.['toDate']) return '—';
    const d = this.computedLeaveDays;
    if (d <= 0) return '—';
    if (d === 0.5) return '0.5 day';
    if (d === 1) return '1 day';
    return `${d} days`;
  }

  onFromDateChange() {
    if (this.obj?.['fromDate'] && this.obj?.['toDate'] && this.obj['toDate'] < this.obj['fromDate']) {
      this.obj['toDate'] = this.obj['fromDate'];
    }
    this.syncHalfDayWhenSingle();
  }

  onToDateChange() {
    this.syncHalfDayWhenSingle();
  }

  onFromDurationChange() {
    this.syncHalfDayWhenSingle();
  }

  /** Single calendar day: keep both duration fields in sync for API. */
  private syncHalfDayWhenSingle() {
    if (!this.isSingleLeaveDay) return;
    const d = this.obj?.['duration_type'] || 'full';
    if (this.obj['to_duration_type'] !== d) {
      this.obj['to_duration_type'] = d;
    }
  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]
  leaveStatus: any = [{ value: 'pending', label: 'Pending' },{ value: 'recommended', label: 'Recommended' },{ value: 'self_declined', label: 'Self Declined' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]
  editStatusList: any = [
    { value: 'pending', label: 'Pending' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  EmployeeForm!: FormGroup;
  EmployeeList = [];
  editingId: string | null = null;
  minDate: any
  fromDashboard = false;
  emergencyOnly = false;
  constructor(
    private fb: FormBuilder,
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
    private route: ActivatedRoute,
    public messagingService: MessagingService
  ) {
    this.EmployeeForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
    this.fromDashboard = this.route.snapshot.queryParamMap.get('fromDashboard') === 'true';
    this.emergencyOnly = this.route.snapshot.queryParamMap.get('emergencyOnly') === 'true';
    if (this.fromDashboard) {
      this.obj['todayActive'] = true;
    }
    if (this.emergencyOnly) {
      this.obj['emergencyOnly'] = true;
    }
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
    if (!this.obj?.['employeeId'] || !this.obj?.['leaveTypeId'] || !this.obj?.['fromDate'] || !this.obj?.['toDate']) {
      this.notyf.error('Please fill Employee, Leave Type, From and To dates');
      return;
    }

    this.syncHalfDayWhenSingle();

    if (this.updateFlag && this.editingId) {
      const payload = {
        id: this.editingId,
        employeeId: this.obj['employeeId'],
        leaveTypeId: this.obj['leaveTypeId'],
        fromDate: this.obj['fromDate'],
        toDate: this.obj['toDate'],
        duration_type: this.obj['duration_type'] || 'full',
        to_duration_type: this.obj['to_duration_type'] || this.obj['duration_type'] || 'full',
        reason: this.obj['reason'] || null,
        status: this.obj['status'] || 'pending',
      };
      this.master.UpdateAppliedLeave(payload).subscribe({
        next: (response: any) => {
          const message = response.message ? response.message : 'Leave updated successfully';
          const status = this.statusService.handleResponseStatus(response.status, message);
          if (status === true) {
            this.notyf.success(message);
            this.getApplyLeaveList();
            this.resetForm();
          } else if (status === 'expired') {
            this.router.navigate(['login']);
          } else {
            this.notyf.error(message);
          }
        },
        error: (err) => {
          console.error('Error:', err);
          this.notyf.error(err.error?.message || 'Failed to update leave');
        },
      });
      return;
    }

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
  getStatusClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'badge-outline-success';
      case 'rejected': return 'badge-outline-danger';
      case 'pending': return 'badge-outline-warning';
      case 'recommended': return 'badge-outline-info';
      default: return 'badge-outline-secondary';
    }
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
    this.updateFlag = false
    this.obj = { duration_type: 'full', to_duration_type: 'full' }
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
    this.obj = { duration_type: 'full', to_duration_type: 'full' }
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
    this.editingId = null
  }

  openEdit(item: any) {
    if (!item?.id) return;
    if (!['pending', 'recommended'].includes(String(item.status || '').toLowerCase())) {
      this.notyf.error('Only pending/recommended leaves can be edited');
      return;
    }
    this.editingId = item.id;
    this.updateFlag = true;
    this.createFlag = true;
    this.listflag = false;
    this.obj = {
      employeeId: item.employeeId,
      leaveTypeId: item.leaveTypeId,
      fromDate: item.fromDate,
      toDate: item.toDate || item.fromDate,
      duration_type: item.duration_type || 'full',
      to_duration_type: item.to_duration_type || item.duration_type || 'full',
      reason: item.reason || '',
      status: item.status || 'pending',
    };
    this.syncHalfDayWhenSingle();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  back() {
    this.resetForm();
  }

}
