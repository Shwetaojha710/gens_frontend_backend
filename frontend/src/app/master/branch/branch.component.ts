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
import { LocationsService } from '../../services/locations.service';

@Component({
  selector: 'app-branch',
  imports: [NgSelectModule, FormsModule, CommonModule],
  templateUrl: './branch.component.html',
  styleUrl: './branch.component.css'
})
export class BranchComponent {
  obj: any = {}
  notyf: Notyf;

  // Image state
  selectedImage: File | null = null;
  imagePreview: string | null = null;

  back() {
    this.obj = {}
    this.createFlag = false
    this.selectedImage = null;
    this.imagePreview = null;
  }

  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  BranchForm!: FormGroup;
  BranchList: any[] = [];
  editingId: number | null = null;
  latitude!: number;
  longitude!: number;

  constructor(
    private locationService: LocationsService,
    private fb: FormBuilder,
    private BranchService: MasterService,
    public statusService: StatusService,
    private router: Router,
  ) {
    this.BranchForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });
    this.notyf = new Notyf();
  }

  getLocation() {
    this.locationService.getCurrentLocation()
      .then((res) => {
        this.latitude = res.latitude;
        this.longitude = res.longitude;
        this.obj['latitude'] = this.latitude;
        this.obj['longitude'] = this.longitude;
      })
      .catch((err) => {
        console.error('Location error:', err);
      });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImage = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

  removeImage() {
    this.selectedImage = null;
    this.imagePreview = null;
    this.obj['image'] = null;
  }

  getBranchImageUrl(filename: string): string {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename;
    return this.BranchService.getImageUrl(filename);
  }

  searchText: any = '';

  async ngOnInit() {
    this.BranchForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
    await this.fetchBranchs();
  }

  applyFilter(event: any) {
    const value = event?.target?.value || '';
    this.searchText = value.trim();
    if (this.searchText === '') {
      this.BranchList = [...this.originalList];
    } else {
      this.BranchList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  onItemsPerPageChange(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1;
    this.fetchBranchs();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchBranchs();
  }

  getStatusClass(status: any): string {
    switch (status) {
      case 'active': return 'badge-outline-success';
      case 'inactive': return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }

  originalList: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  async fetchBranchs() {
    this.BranchList = [];
    this.originalList = [];
    this.BranchService.getBranchs().subscribe(data => {
      if (data['status'] == true) {
        this.BranchList = data.data;
        this.originalList = this.BranchList;
      } else {
        this.notyf.error(data['message']);
      }
    });
  }

  onSubmit() {
    if (!ValidationUtil.showRequiredError('Branch name', this.obj.name, this.notyf)) {
      return;
    }

    const formData = new FormData();
    formData.append('name', this.obj.name || '');
    formData.append('latitude', this.obj.latitude || '');
    formData.append('longitude', this.obj.longitude || '');
    formData.append('description', this.obj.description || '');
    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    }

    this.BranchService.addBranchWithImage(formData).subscribe({
      next: (response: any) => {
        let message = response.message || 'Branch created successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchBranchs();
          this.resetForm();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err?.error?.message || err?.message || 'Error creating branch');
      }
    });
  }

  update(dept: any) {
    this.obj = Object.assign({}, dept);
    this.editingId = this.obj.id;
    this.createFlag = true;
    this.updateFlag = true;
    // Show existing image preview
    this.selectedImage = null;
    this.imagePreview = dept.image ? this.getBranchImageUrl(dept.image) : null;
  }

  updatedata() {
    const formData = new FormData();
    formData.append('id', this.obj.id);
    formData.append('name', this.obj.name || '');
    formData.append('latitude', this.obj.latitude || '');
    formData.append('longitude', this.obj.longitude || '');
    formData.append('status', this.obj.status || 'active');
    formData.append('description', this.obj.description || '');
    if (this.selectedImage) {
      formData.append('image', this.selectedImage);
    }

    this.BranchService.updateBranchWithImage(formData).subscribe({
      next: (response: any) => {
        let message = response.message || 'Branch updated successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchBranchs();
          this.resetForm();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => {
        console.error('Error:', err);
        let ErrorMessage = err?.error?.message || err?.message || 'Error updating branch';
        this.notyf.error(ErrorMessage);
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
        this.deleteBranch(data);
      }
    });
  }

  deleteBranch(data: any) {
    this.BranchService.deleteBranch(data).subscribe({
      next: (response: any) => {
        let message = response.message || 'Branch deleted successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchBranchs();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err.message);
      }
    });
  }

  resetForm() {
    this.createFlag = false;
    this.obj = {};
    this.editingId = null;
    this.selectedImage = null;
    this.imagePreview = null;
  }

  isInvalid(field: string): boolean {
    const control = this.BranchForm.get(field);
    return !!(control && control.touched && control.invalid);
  }

  createFlag: any = false;
  listflag: any = true;
  updateFlag: any = false;

  opencreate() {
    this.obj = {};
    this.createFlag = true;
    this.listflag = false;
    this.updateFlag = false;
    this.selectedImage = null;
    this.imagePreview = null;
  }
}
