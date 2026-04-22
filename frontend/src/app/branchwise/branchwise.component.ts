import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DashboardService } from '../services/dashboard.service';
import { MasterService } from '../services/master.service';
import { LocationsService } from '../services/locations.service';
import { Notyf } from 'notyf';
import { ChartOptions } from '../dashboard/dashboard.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
@Component({
  selector: 'app-branchwise',
  imports: [FormsModule,NgSelectModule, CommonModule ],
  templateUrl: './branchwise.component.html',
  styleUrl: './branchwise.component.css'
})
export class BranchwiseComponent implements OnInit, OnDestroy {

  private backSub!: Subscription;
  notyf: Notyf = new Notyf();
  public chartOptions!: Partial<ChartOptions>;
  branchList: any
  allBranchList: any = []
  modalSearchText: string = ''
  modalFilteredBranches: any = []
  sliderIndex = 0;
  readonly slidesVisible = 4;
  obj: any = {};
  stats: any = []
  tenantDetails: any = {}
  updateFlag:any=false
  branchDt = [
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "X-Y-Z",
      "description": "Central administration and monitoring access."
    },
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "A-B-C",
      "description": "Central administration and monitoring access."
    },
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "D-E-F",
      "description": "Central administration and monitoring access."
    }
  ]
  baseurl: any;

  // Add branch modal state
  newBranch: any = {};
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  addBranchLoading = false;

  // Edit branch modal state
  editBranch: any = {};
  editBranchId: string | null = null;
  editSelectedImage: File | null = null;
  editImagePreview: string | null = null;
  editBranchLoading = false;

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    public masterService: MasterService,
    private locationService: LocationsService
  ) {
    this.baseurl = this.masterService.getBaseUrl();
    this.getBranchDD()
    this.tenantDetails = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.tenantDetails.image = `${this.baseurl}${this.tenantDetails['image']}`
  }

  ngOnInit(): void {
    this.backSub = this.router.events.pipe(
      filter(e => e instanceof NavigationStart && e.navigationTrigger === 'popstate')
    ).subscribe(() => {
      localStorage.clear();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  }

  ngOnDestroy(): void {
    this.backSub?.unsubscribe();
  }

  employeeList: any = []
  getEmployeeList() {
    this.branchList = []
    this.employeeList = []
    this.masterService.AppEmpList().subscribe((res) => {
      if (res.status == true) {
        this.notyf.success(res.message || 'Dashboard data loaded successfully')
        this.stats = res.data.stats;
        this.employeeList = res.data
      } else if (res.status == 'expired') {
        this.router.navigate(['login'])
      } else {
        this.notyf.error(res.message || 'Something went wrong')
      }
    });
  }

  cardData: any = {}

createFlag = false;
  create() {
    this.createFlag = true;
  }

  getBranchDD() {
    this.branchList = []
    this.masterService.BranchDD().subscribe((res) => {
      if (res.status == true) {
        this.notyf.success(res.message || 'Dashboard data loaded successfully')
        this.stats = res.data.stats;
        this.allBranchList = res.data.length > 0 ? res.data : this.branchDt;
        this.branchList = this.allBranchList.slice(0, 4);
        this.modalFilteredBranches = this.allBranchList.slice(4);
      } else if (res.status == 'expired') {
        this.router.navigate(['login'])
      } else {
        this.notyf.error(res.message || 'Something went wrong')
      }
    });
  }

  searchModalBranches() {
    const text = this.modalSearchText.trim().toLowerCase();
    if (!text) {
      this.modalFilteredBranches = [...this.allBranchList];
    } else {
      this.modalFilteredBranches = this.allBranchList.filter((b: any) =>
        b.name?.toLowerCase().includes(text) || b.description?.toLowerCase().includes(text)
      );
    }
  }

  clearModalSearch() {
    this.modalSearchText = '';
    this.modalFilteredBranches = this.allBranchList.slice(4);
  }

  openAddBranchModal() {
    this.newBranch = {};
    this.selectedImage = null;
    this.imagePreview = null;
    this.addBranchLoading = false;
  }

  fetchLocation() {
    this.locationService.getCurrentLocation()
      .then((res) => {
        this.newBranch['latitude'] = res.latitude;
        this.newBranch['longitude'] = res.longitude;
      })
      .catch(() => {
        this.notyf.error('Could not fetch location. Please enter manually.');
      });
  }

  onImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.selectedImage = file;
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  submitNewBranch() {
    if (!this.newBranch['name']?.trim()) {
      this.notyf.error('Branch name is required.');
      return;
    }
    this.addBranchLoading = true;
    const formData = new FormData();
    formData.append('name', this.newBranch['name']);
    if (this.newBranch['description']) formData.append('description', this.newBranch['description']);
    if (this.newBranch['latitude']) formData.append('latitude', this.newBranch['latitude']);
    if (this.newBranch['longitude']) formData.append('longitude', this.newBranch['longitude']);
    if (this.selectedImage) formData.append('image', this.selectedImage);

    this.masterService.addBranchWithImage(formData).subscribe({
      next: (res: any) => {
        this.addBranchLoading = false;
        if (res.status === true) {
          this.notyf.success(res.message || 'Branch added successfully');
          this.getBranchDD();
          // close modal programmatically
          const btn = document.getElementById('closeAddBranchModal');
          if (btn) btn.click();
        } else if (res.status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(res.message || 'Something went wrong');
        }
      },
      error: (err: any) => {
        this.addBranchLoading = false;
        this.notyf.error(err?.error?.message || err?.message || 'Something went wrong');
      }
    });
  }

  getCardImageUrl(branch: any): string {
    if (branch.image) {
      return this.masterService.getImageUrl(branch.image);
    }
    return '/assets/img/bg-login/lko-bg.png';
  }

  openEditBranchModal(branch: any) {
    this.editBranch = { ...branch };
    this.editBranchId = branch.id;
    this.editSelectedImage = null;
    this.editImagePreview = branch.image ? this.masterService.getImageUrl(branch.image) : null;
    this.editBranchLoading = false;
  }

  onEditImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.editSelectedImage = file;
    const reader = new FileReader();
    reader.onload = () => { this.editImagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  fetchLocationForEdit() {
    this.locationService.getCurrentLocation()
      .then((res) => {
        this.editBranch['latitude'] = res.latitude;
        this.editBranch['longitude'] = res.longitude;
      })
      .catch(() => {
        this.notyf.error('Could not fetch location. Please enter manually.');
      });
  }

  submitEditBranch() {
    if (!this.editBranch['name']?.trim()) {
      this.notyf.error('Branch name is required.');
      return;
    }
    this.editBranchLoading = true;
    const formData = new FormData();
    formData.append('id', this.editBranchId!);
    formData.append('name', this.editBranch['name']);
    if (this.editBranch['description']) formData.append('description', this.editBranch['description']);
    if (this.editBranch['latitude']) formData.append('latitude', this.editBranch['latitude']);
    if (this.editBranch['longitude']) formData.append('longitude', this.editBranch['longitude']);
    if (this.editBranch['status']) formData.append('status', this.editBranch['status']);
    if (this.editSelectedImage) formData.append('image', this.editSelectedImage);

    this.masterService.updateBranchWithImage(formData).subscribe({
      next: (res: any) => {
        this.editBranchLoading = false;
        if (res.status === true) {
          this.notyf.success(res.message || 'Branch updated successfully');
          this.getBranchDD();
          const btn = document.getElementById('closeEditBranchModal');
          if (btn) btn.click();
        } else if (res.status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(res.message || 'Something went wrong');
        }
      },
      error: (err: any) => {
        this.editBranchLoading = false;
        this.notyf.error(err?.error?.message || err?.message || 'Something went wrong');
      }
    });
  }

  goToDashboard(branch: any) {
    // store branch id (important for future APIs)
    localStorage.setItem('branchId', branch.id);
    console.log("reacheedd");

    // redirect to dashboard
    // this.router.navigate(['/layout/dashboard']);
    this.router.navigate(['landing-home']);
  }

  getStatusClass(status: any): string {
    switch (status) {
      case true: return 'badge-outline-success';
      case false: return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }


  filteredDesignation: any = []
  searchText: any = ''
  originalList: any = []
    getUserStatusClass(status: any): string {
    switch (status) {
      case 'active': return 'badge-outline-success';
      case 'inactive': return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }

  gotoList(){
    this.router.navigate(['pending-emp-list']);
  }

  gotoback(){
    this.router.navigate(['landing-home']);
  }

  get maxSliderIndex(): number {
    return Math.max(0, this.allBranchList.length - this.slidesVisible);
  }

  get sliderTranslate(): string {
    return `translateX(-${this.sliderIndex * (100 / this.slidesVisible)}%)`;
  }

  prevSlide(): void {
    if (this.sliderIndex > 0) this.sliderIndex--;
  }

  nextSlide(): void {
    if (this.sliderIndex < this.maxSliderIndex) this.sliderIndex++;
  }

}
