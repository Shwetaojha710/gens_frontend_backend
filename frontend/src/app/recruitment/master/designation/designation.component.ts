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
  selector: 'app-recruitment-designation',
  imports: [NgSelectModule, FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './designation.component.html',
  styleUrl: './designation.component.css'
})
export class RecruitmentDesignationComponent {
  obj: any = {};
  notyf: Notyf;
  designationList: any[] = [];
  originalList: any[] = [];
  filteredDesignations: any[] = [];
  departmentDD: any[] = [];

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
    await this.loadDepartmentDD();
    await this.fetchDesignations();
  }

  loadDepartmentDD() {
    this.master.Departmentsdd({}).subscribe({
      next: (response: any) => {
        if (response.status === true) {
          this.departmentDD = response.data;
        }
      },
      error: (err) => this.notyf.error(err?.message)
    });
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
    this.designationList = data;
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredDesignations = data.slice(start, start + this.pageSize);
  }

  async fetchDesignations() {
    this.designationList = [];
    this.originalList = [];
    this.master.getDesignations().subscribe({
      next: (data: any) => {
        const status = this.statusService.handleResponseStatus(data.status, data.message);
        if (status === true) {
          const mapped = data.data.map((item: any, index: number) => ({
            ...item,
            si_no: index + 1
          }));
          this.designationList = mapped;
          this.originalList = mapped;
          const start = (this.currentPage - 1) * this.pageSize;
          this.filteredDesignations = mapped.slice(start, start + this.pageSize);
        } else if (status === 'expired') {
          this.router.navigate(['login']);
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
    if (!ValidationUtil.showRequiredError('Designation name', this.obj.name, this.notyf)) return;
    if (!ValidationUtil.showRequiredError('Department', this.obj['department'], this.notyf)) return;

    this.master.adddesignation(this.obj).subscribe({
      next: (response: any) => {
        const message = response.message || 'Saved successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchDesignations();
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

  update(item: any) {
    this.obj = Object.assign({}, item);
    this.editingId = this.obj.id;
    this.createFlag = true;
    this.updateFlag = true;
  }

  updatedata() {
    this.master.updatedesignation(this.editingId, this.obj).subscribe({
      next: (response: any) => {
        const message = response.message || 'Updated successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchDesignations();
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
      if (result.isConfirmed) this.deleteDesignation(item);
    });
  }

  deleteDesignation(data: any) {
    const obj: any = { id: data.id };
    this.master.deletedesignation(obj).subscribe({
      next: (response: any) => {
        const message = response.message || 'Deleted successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchDesignations();
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
