import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { SearchPaginationComponent } from '../../../master/search-pagination/search-pagination.component';
import { MasterService } from '../../../services/master.service';
import { StatusService } from '../../../services/status.service';
import { ValidationUtil } from '../../../shared/utils/validation.util';

@Component({
  selector: 'app-recruitment-department',
  imports: [NgSelectModule, FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './department.component.html',
  styleUrl: './department.component.css'
})
export class RecruitmentDepartmentComponent {
  obj: any = {};
  notyf: Notyf;
  departmentList: any[] = [];
  originalList: any[] = [];
  filteredDepartments: any[] = [];

  createFlag = false;
  updateFlag = false;
  editingId: any = null;

  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;

  status: any = [
    { value: 'active', label: 'ACTIVE' },
    { value: 'inactive', label: 'INACTIVE' }
  ];

  constructor(
    private master: MasterService,
    public statusService: StatusService,
    private router: Router
  ) {
    this.notyf = new Notyf();
  }

  async ngOnInit() {
    await this.fetchDepartments();
  }

  onSearch(term: string) {
    this.searchTerm = term.toLowerCase();
    this.currentPage = 1;
    this.applyFilters();
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

  applyFilters() {
    const term = this.searchTerm.trim();
    let data = term
      ? this.originalList.filter((item: any) =>
          JSON.stringify(item).toLowerCase().includes(term)
        )
      : [...this.originalList];
    this.departmentList = data;
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredDepartments = data.slice(start, start + this.pageSize);
  }

  async fetchDepartments() {
    this.departmentList = [];
    this.originalList = [];
    this.master.getDepartments().subscribe({
      next: (data: any) => {
        if (data.status === true) {
          const mapped = data.data.map((item: any, index: number) => ({
            ...item,
            si_no: index + 1
          }));
          this.departmentList = mapped;
          this.originalList = mapped;
          const start = (this.currentPage - 1) * this.pageSize;
          this.filteredDepartments = mapped.slice(start, start + this.pageSize);
        } else {
          this.notyf.error(data.message);
        }
      },
      error: (err) => this.notyf.error(err?.message)
    });
  }

  getStatusClass(status: any): string {
    switch (status) {
      case 'active': return 'badge-outline-success';
      case 'inactive': return 'badge-outline-danger';
      default: return 'bg-light-secondary';
    }
  }

  opencreate() {
    this.obj = {};
    this.createFlag = true;
    this.updateFlag = false;
  }

  back() {
    this.obj = {};
    this.createFlag = false;
    this.updateFlag = false;
  }

  onSubmit() {
    if (!ValidationUtil.showRequiredError('Department name', this.obj.name, this.notyf)) return;

    this.master.addDepartment(this.obj).subscribe({
      next: (response: any) => {
        const message = response.message || 'Saved successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchDepartments();
          this.back();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || err?.message)
    });
  }

  update(dept: any) {
    this.obj = Object.assign({}, dept);
    this.editingId = this.obj.id;
    this.createFlag = true;
    this.updateFlag = true;
  }

  updatedata() {
    this.master.updateDepartment(this.editingId, this.obj).subscribe({
      next: (response: any) => {
        const message = response.message || 'Updated successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchDepartments();
          this.back();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || err?.message)
    });
  }

  delete(item: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) this.deleteDepartment(item);
    });
  }

  deleteDepartment(data: any) {
    this.master.deleteDepartment(data).subscribe({
      next: (response: any) => {
        const message = response.message || 'Deleted successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchDepartments();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => this.notyf.error(err?.message)
    });
  }
}
