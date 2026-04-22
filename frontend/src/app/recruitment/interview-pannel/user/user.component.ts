import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { InterviewService } from '../../../services/interview.service';
import { MasterService } from '../../../services/master.service';
import { StatusService } from '../../../services/status.service';
import { SearchPaginationComponent } from '../../../master/search-pagination/search-pagination.component';
import { InterviewPanelUser } from '../../recruitment.models';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, SearchPaginationComponent],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {
  notyf = new Notyf();

  obj: Partial<InterviewPanelUser> = {};

  createFlag = false;
  updateFlag = false;

  userList: InterviewPanelUser[] = [];
  originalList: InterviewPanelUser[] = [];

  departments: any[] = [];
  designations: any[] = [];

  statusOptions = [
    { value: 'active', label: 'ACTIVE' },
    { value: 'inactive', label: 'INACTIVE' }
  ];

  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  fieldErrors: Record<string, string> = {};

  private readonly NAME_SPECIAL_CHARS = /[+\-#$@!%^&*()=[\]{};:'"`,<>?/\\|~]/;
  private readonly NAME_VALID = /^[a-zA-Z\s.]+$/;
  private readonly EMAIL_BLOCKED = /[+\-#$]/;
  private readonly EMAIL_VALID = /^[a-zA-Z0-9._%]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  blockNameSpecialChars(event: KeyboardEvent): void {
    if (event.key.length === 1 && this.NAME_SPECIAL_CHARS.test(event.key)) {
      event.preventDefault();
    }
  }

  validateName(field: 'first_name' | 'last_name', value: string | undefined): void {
    const label = field === 'first_name' ? 'First name' : 'Last name';
    const val = value?.trim() || '';
    if (!val) {
      this.fieldErrors[field] = `${label} is required`;
    } else if (this.NAME_SPECIAL_CHARS.test(val)) {
      this.fieldErrors[field] = `${label} cannot contain special characters (+, -, #, $, etc.)`;
    } else if (!this.NAME_VALID.test(val)) {
      this.fieldErrors[field] = `${label} can only contain letters and spaces`;
    } else {
      delete this.fieldErrors[field];
    }
  }

  validateEmail(value: string | undefined): void {
    const val = value?.trim() || '';
    if (!val) {
      this.fieldErrors['email'] = 'Email is required';
    } else if (this.EMAIL_BLOCKED.test(val)) {
      this.fieldErrors['email'] = 'Email cannot contain +, -, # or $ characters';
    } else if (!this.EMAIL_VALID.test(val)) {
      this.fieldErrors['email'] = 'Please enter a valid email address';
    } else {
      delete this.fieldErrors['email'];
    }
  }

  constructor(
    private interviewService: InterviewService,
    private masterService: MasterService,
    public statusService: StatusService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    // this.loadDesignations();
    this.fetchUsers();
  }

  loadDepartments(): void {
    this.masterService.Departmentsdd({}).subscribe({
      next: (res: any) => {
        if (res.status === true) this.departments = res.data;
      }
    });
  }

  loadDesignations(departmentId: any): void {
    this.obj['designation']=undefined
     let NewObj: any = {}
    NewObj['department'] = departmentId?.value || departmentId
    this.masterService.designationDD(NewObj).subscribe({
      next: (res: any) => {
        if (res.status === true) this.designations = res.data;
      }
    });
  }

  //   designationDD: any = []
  // getDesignation(departmentId: any) {
  //   this.designationDD = []
  //   let obj: any = {}
  //   obj['department'] = departmentId?.value || departmentId
  //   this.master.designationDD(obj).subscribe({
  //     next: (response: any) => {
  //       console.log('response', response);

  //       let message = response.message ? response.message : 'Data found Successfully';

  //       if (response.status === true) {
  //         this.designationDD = response.data;

  //       }
  //       else if (response.status == "expired") {
  //         this.router.navigate(["login"]);
  //       }

  //       else {
  //         this.notyf.error(message)
  //       }

  //     },
  //     error: (err) => {
  //       console.error('Error:', err);
  //       this.notyf.error(err)
  //     }
  //   });
  // }

  fetchUsers(): void {
    this.interviewService.listInterviewPanelUsers().subscribe({
      next: (res) => {
        if (res.status === true) {
          this.userList = res.data;
          this.originalList = [...res.data];
        } else {
          this.notyf.error('Failed to load panel users');
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Error loading users')
    });
  }

  opencreate(): void {
    this.obj = {};
    this.createFlag = true;
    this.updateFlag = false;
  }

  back(): void {
    this.obj = {};
    this.fieldErrors = {};
    this.createFlag = false;
    this.updateFlag = false;
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;

    this.interviewService.createInterviewPanelUser(this.obj as InterviewPanelUser).subscribe({
      next: (res: any) => {
        const message = res.message || 'User added successfully';
        const status = this.statusService.handleResponseStatus(res.status, message);
        if (status == true) {
          this.notyf.success(message);
          this.fetchUsers();
          this.back();
        } else if (status == 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Error saving user')
    });
  }

  edit(item: InterviewPanelUser): void {
    this.obj = { ...item };
    this.createFlag = true;
    this.updateFlag = true;
  }

  updateData(): void {
    if (!this.isFormValid()) return;

    this.interviewService.updateInterviewPanelUser(this.obj as InterviewPanelUser).subscribe({
      next: (res: any) => {
        const message = res.message || 'User updated successfully';
        const status = this.statusService.handleResponseStatus(res.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchUsers();
          this.back();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Error updating user')
    });
  }

  delete(item: InterviewPanelUser): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this panel user?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.interviewService.deleteInterviewPanelUser({ id: item.id! }).subscribe({
          next: (res: any) => {
            const message = res.message || 'User deleted';
            const status = this.statusService.handleResponseStatus(res.status, message);
            if (status === true) {
              this.notyf.success(message);
              this.fetchUsers();
            } else if (status === 'expired') {
              this.router.navigate(['login']);
            } else {
              this.notyf.error(message);
            }
          },
          error: (err) => this.notyf.error(err?.error?.message || 'Error deleting user')
        });
      }
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase().trim();
    this.currentPage = 1;
    if (this.searchTerm === '') {
      this.userList = [...this.originalList];
    } else {
      this.userList = this.originalList.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(this.searchTerm)
      );
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'badge-outline-success' : 'badge-outline-danger';
  }

  private isFormValid(): boolean {
    this.fieldErrors = {};

    const firstName = this.obj.first_name?.trim() || '';
    if (!firstName) {
      this.fieldErrors['first_name'] = 'First name is required';
    } else if (this.NAME_SPECIAL_CHARS.test(firstName) || !this.NAME_VALID.test(firstName)) {
      this.fieldErrors['first_name'] = 'First name cannot contain special characters';
    }

    const lastName = this.obj.last_name?.trim() || '';
    if (!lastName) {
      this.fieldErrors['last_name'] = 'Last name is required';
    } else if (this.NAME_SPECIAL_CHARS.test(lastName) || !this.NAME_VALID.test(lastName)) {
      this.fieldErrors['last_name'] = 'Last name cannot contain special characters';
    }

    const email = this.obj.email?.trim() || '';
    if (!email) {
      this.fieldErrors['email'] = 'Email is required';
    } else if (this.EMAIL_BLOCKED.test(email)) {
      this.fieldErrors['email'] = 'Email cannot contain +, -, # or $ characters';
    } else if (!this.EMAIL_VALID.test(email)) {
      this.fieldErrors['email'] = 'Please enter a valid email address';
    }

    if (!this.obj.mobile_no?.trim()) {
      this.fieldErrors['mobile_no'] = 'Mobile number is required';
    } else if (!/^[6-9][0-9]{9}$/.test(this.obj.mobile_no.trim())) {
      this.fieldErrors['mobile_no'] = 'Must be 10 digits starting with 6, 7, 8, or 9';
    }

    if (!this.obj.department) this.fieldErrors['department'] = 'Department is required';
    if (!this.obj.designation) this.fieldErrors['designation'] = 'Designation is required';

    if (Object.keys(this.fieldErrors).length > 0) {
      this.notyf.error(Object.values(this.fieldErrors)[0]);
      return false;
    }
    return true;
  }
}
