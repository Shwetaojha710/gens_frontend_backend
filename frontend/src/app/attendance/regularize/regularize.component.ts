import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import { MasterService } from '../../services/master.service';
import { MessagingService } from '../../services/messaging.service';
import { StatusService } from '../../services/status.service';

@Component({
  selector: 'app-regularize',
  imports: [NgSelectModule,FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './regularize.component.html',
  styleUrl: './regularize.component.css'
})

export class RegularizeComponent {
  obj: any = {}
  notyf: Notyf;

  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]
  leaveStatus: any = [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  EmployeeForm!: FormGroup;
  EmployeeList = [];
  editingId: number | null = null;
  minDate: any
  fromDashboard: any = 'false'
  constructor(
    private fb: FormBuilder,
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
    public messagingService: MessagingService,
    private route: ActivatedRoute
  ) {
    // Check if we came from the dashboard, e.g., via a query param
    this.fromDashboard = this.route.snapshot.queryParamMap.get('fromDashboard');
    const today1 = new Date();
    // if (this.fromDashboard == 'true') {
    this.obj['emp_id'] = 'All';

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    this.obj['startDate'] = `${year}-${month}-${day}`;
    this.obj['endDate'] = `${year}-${month}-${day}`;
    this.getRegularize();


    // } else {
    //   this.fromDashboard = 'false'
    // }
    this.minDate = today1.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
  }
  // This will return either today (for "from date") or selected fromDate (for "to date")
  getToDateMin(): string {
    return this.obj['fromDate'] || this.minDate;
  }
  async ngOnInit() {
    this.EmployeeForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
    this.obj['status'] = 'pending'
    // if (this.fromDashboard == 'true') {
    this.obj['emp_id'] = 'All';

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    this.obj['startDate'] = `${year}-${month}-${day}`;
    this.obj['endDate'] = `${year}-${month}-${day}`;
    await this.empList();
    await this.getRegularize()




  }

  masterSelected: boolean = false;
  checkUncheckAll() {
    // Apply changes on original list (not only paginated list)
    this.applyRegularizeList.forEach((item: any) => {
      item.isSelected = this.masterSelected;
    });
  }

  isAllSelected() {
    this.masterSelected = this.applyRegularizeList.every((item: any) => item.isSelected);
  }
  EmpList: any = []
  async empList() {
    this.EmpList = []
    this.master.getemployeeList().subscribe((data: { [x: string]: any; data: any; }) => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
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
  setMinToDate() {
    if (this.obj['startDate']) {
      const fromDate = new Date(this.obj['startDate']);

      if (!isNaN(fromDate.getTime())) {  // ✅ valid date check
        this.minDate = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }

  }
  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;

  onSearch(term: string) {
    if (!term) {
      this.searchText = ''
      this.getRegularize()
    } else {
      this.searchTerm = term.toLowerCase();
      this.currentPage = 1;
      this.applyFilters();
    }

    // this.loadEmployees()
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

    let data = [...this.applyRegularizeList];
    const value = this.searchTerm || '';
    this.searchText = value.trim();
    if (this.searchText === '') {
      this.applyRegularizeList = [...this.originalList];
    } else {
      this.applyRegularizeList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
    // pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredDesignation = data.slice(start, end);

  }
  applyRegularizeList: any = []
  originalList: any = []
  async getRegularize() {
    this.applyRegularizeList = []
    this.originalList = []
    this.filteredDesignation = []

    this.master.getRegularizeList(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {


          // this.notyf.success(message)
          this.applyRegularizeList = response.data
          this.originalList = response.data
          // pagination
          const start = (this.currentPage - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.filteredDesignation = this.applyRegularizeList.slice(start, end);
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
          this.RejectRegularize(item, status)

        } else if (

          result.dismiss === Swal.DismissReason.cancel
        ) {

        }
      });

    }
    else {
      let newObj: any = {}
      newObj['ids'] = item.id
      newObj['status'] = status
      newObj['employeeId'] = item.employeeId

      this.master.UpdateApplyRegularizeStatus(newObj).subscribe({
        next: (response: any) => {
          let message = response.message ? response.message : 'Data found Successfully';
          let status = this.statusService.handleResponseStatus(response.status, message);
          if (status === true) {

            this.notyf.success(message)
            this.getRegularize();
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

  }

  RejectRegularize(item: any, status: any) {
    let newObj: any = {}
    newObj = Object.assign({}, item)
    // newObj['id']=item.id
    newObj['status'] = status
    // newObj['employeeId']=item.employeeId

    this.master.UpdateApplyRegularizeStatus(newObj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)

          this.getRegularize();
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
          this.getRegularize();
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
    // this.obj = {}

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

  approveAll() {
    const selected = this.applyRegularizeList.filter((item: any) => item.isSelected);

    if (selected.length === 0) {
      this.notyf.error("Please select at least one record");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `You are about to APPROVE ${selected.length} requests`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Approve All",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        const payload = {
          ids: selected.map((x: any) => x.id),
          status: "approved"
        };

        this.master.UpdateApplyRegularizeStatus(payload).subscribe({
          next: (response: any) => {
            let message = response.message || "Approved Successfully";
            let status = this.statusService.handleResponseStatus(response.status, message);

            if (status === true) {
              this.notyf.success(message);

              // Reset selections
              this.masterSelected = false;
              this.applyRegularizeList.forEach((item: any) => item.isSelected = false);

              this.getRegularize(); // refresh list
            }
            else if (status === "expired") {
              this.router.navigate(["login"]);
            } else {
              this.notyf.error(message);
            }
          },
          error: (err: any) => {
            console.error("Error:", err);
            this.notyf.error(err.error?.message || "Something went wrong");
          }
        });
      }
    });
  }


}
