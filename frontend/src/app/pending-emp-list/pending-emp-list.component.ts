import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { DashboardService } from '../services/dashboard.service';
import { MasterService } from '../services/master.service';
import { StatusService } from '../services/status.service';
import { EmployeeService } from '../services/employee.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { SearchPaginationComponent } from '../master/search-pagination/search-pagination.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pending-emp-list',
  imports: [FormsModule, CommonModule, NgSelectModule, SearchPaginationComponent],
  templateUrl: './pending-emp-list.component.html',
  styleUrl: './pending-emp-list.component.css'
})
export class PendingEmpListComponent implements OnDestroy {
  @ViewChild('adminCameraVideo') adminCameraVideo?: ElementRef<HTMLVideoElement>;
  baseurl: any
  notyf: Notyf = new Notyf();
  tenantDetails: any = {}
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
  itemsPerPage = 10;
  updateFlag: any = false
  maxDate: any
  constructor(private employeeService: EmployeeService, private master: MasterService, public statusService: StatusService, private dashboardService: DashboardService, private router: Router, public masterService: MasterService) {
    this.baseurl = this.masterService.getBaseUrl();
    this.getBranchDD()
    this.tenantDetails = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.tenantDetails.image = `${this.baseurl}${this.tenantDetails['image']}`
    this.notyf = new Notyf();
    const today = new Date();
    const year = today.getFullYear() - 18;
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.maxDate = `${year}-${month}-${day}`;
  }
  back() {
    this.closeAdminCamera();
    this.personalDetails = {}
    this.profileImagePreview = null;
    this.selectedProfileFile = null;
    this.createFlag = false
    this.employeeList = []
  }

  ngOnDestroy(): void {
    this.closeAdminCamera();
  }
  applyFilters() {
    const value = this.searchTerm || '';
    this.searchText = value.trim();
    if (this.searchText === '') {
      this.employees = [...this.originalList];
    } else {
      this.employees = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
    // pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredDesignation = this.employees.slice(start, end);
  }

  employees: any = []
  originalList: any = []
  searchTerm: any = ''
  searchText: any = ''
  currentPage = 1
  pageSize = 10
  filteredDesignation: any = []

  async getEmploymentTypes() {
    let obj: any = {}
    obj["branchId"] = this.personalDetails["branchId"]
    this.employmentTypes = [];
    // Pending requests have no branch until one is chosen; nothing to load yet.
    if (!obj["branchId"]) return;
    this.master.getEmploymentTypes(obj).subscribe(data => {
      this.employmentTypes = data.data || [];
    },
      (error: any) => {
        console.error('Error loading employees:', error);
        this.notyf.error(error?.error?.message)
        // alert('Failed to load employees. Please try again.');
      });
  }
  calculateAge(dob: string) {
    if (!dob) return;


    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    this.personalDetails.age = age;
  }
  createFlag: boolean = false;

  async ngOnInit() {
    await this.countrydd();
    await this.loadEmployees();
    await this.getEmploymentTypes();
    await this.DepartmentDD()
    await this.applyFilters()
    await this.getBranchDD()
    this.baseurl = this.master.getBaseUrl();
  }
  departmentDD: any = []
  async DepartmentDD() {

    this.departmentDD = []
    let obj: any = {}
    obj['branchId'] = this.personalDetails['branchId'] ? this.personalDetails['branchId'] : null
    // Pending requests have no branch until one is chosen; avoids a "branchId is required" error.
    if (!obj['branchId']) return;

    this.master.Departmentsdd(obj).subscribe({
      next: (response: any) => {

        let message = response.message ? response.message : 'Data found Successfully';
        // let status = this.statusService.handleResponseStatus(response.status, message);
        // console.log(status)
        // console.log("response", response);

        if (response.status === true) {
          this.departmentDD = response.data;
          // this.notyf.success(message)

          // this.back()
        }
        else if (response.status === "expired") {
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
  designationDD: any = []
  getDesignation(departmentId: any) {
    this.designationDD = []
    let obj: any = {}
    obj['department'] = departmentId?.value || departmentId
    obj['branchId'] = this.personalDetails['branchId'] ? this.personalDetails['branchId'] : null
    this.master.designationDD(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';

        if (response.status === true) {
          this.designationDD = response.data;

        }
        else if (response.status == "expired") {
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


rejectEmployee(item: any) {
  Swal.fire({
    title: 'Reject employee?',
    text: `${item.firstName} ${item.lastName || ''} will be rejected.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, reject',
    confirmButtonColor: '#d33',
  }).then((result) => {
    if (!result.isConfirmed) return;

    const obj = {
      id: item.id,
      branchId: item.branchId,
      emp_status: 'rejected',
      type: 'pending_employee',
    };

    this.employeeService.updateEmp(obj).subscribe({
      next: (response) => {
        const status = this.statusService.handleResponseStatus(response.status, response.message);
        if (status === true) {
          this.notyf.success(response.message || 'Employee rejected');
          this.loadEmployees();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(response.message);
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Failed to reject employee'),
    });
  });
}

rejectform() {
  const dob = new Date(this.personalDetails.dateOfBirth);
  const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;

  const obj = Object.assign({}, this.personalDetails);
  obj.dateOfBirth = formattedDob;
  obj.emp_status = 'rejected';
  obj.type = 'pending_employee';

  this.employeeService.updateEmp(obj).subscribe(
    (response) => {
      const status = this.statusService.handleResponseStatus(response.status, response.message);
      if (status === true) {
        this.notyf.success(response.message || 'Employee rejected');
        this.reset();
        this.loadEmployees();
      } else if (status === 'expired') {
        this.router.navigate(['login']);
      } else {
        this.notyf.error(response.message);
      }
    },
    (error) => this.notyf.error(error?.error?.message || 'Failed to reject employee')
  );
}

  inActiveFlag: any = false
  activeFlag: any = false
  newJoinerFlag: any = false
  totalEmpFlag: any = true

  employeeList: any = []
  cardData: any = {}
  async loadEmployees() {
    // this.filteredDesignation = []
    this.employees = []
    this.employeeList = []
    // this.cardData = []
    this.originalList = []
    this.master.AppEmpList().subscribe((response: any) => {
      if (response && response.data && response.status == true) {
        // this.notyf.success(response.message || 'Employees loaded successfully');
        this.employees = [];
        // this.cardData = response.data.cardData
        if (this.totalEmpFlag == true) {
          this.employees = response.data || [];
          this.originalList = response.data || [];
        }

        this.employees = this.employees.map((item: any, index: any) => {
          const rawPhoto = item.profileImage || null;
          return {
            ...item,
            si_no: index + 1,
            profileImageRaw: rawPhoto,
            profileImage: rawPhoto
              ? `${this.baseurl}${rawPhoto}`
              : item.gender == 'Female'
                ? '../../assets/img/avatars/2.png'
                : '../../assets/img/avatars/1.png',
          };
        });
        this.originalList = this.originalList.map((item: any, index: any) => {
          const rawPhoto = item.profileImage || null;
          return {
            ...item,
            si_no: index + 1,
            profileImageRaw: rawPhoto,
            profileImage: rawPhoto
              ? `${this.baseurl}${rawPhoto}`
              : item.gender == 'Female'
                ? '../../assets/img/avatars/2.png'
                : '../../assets/img/avatars/1.png',
          };
        });

        // pagination
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.filteredDesignation = this.employees.slice(start, end);
      } else if (response.status === false) {
        this.notyf.error(response.message)
      }
      else if (response.status == 'expired') {
        this.router.navigate(['login'])
      }
    },
      (error: any) => {
        console.error('Error loading employees:', error);
        this.notyf.error(error?.error?.message)
        // alert('Failed to load employees. Please try again.');
      }
    );

  }
      branchList: any
stats:any
  getBranchDD() {
    this.branchList = []
    this.master.BranchDD().subscribe((res) => {
      if (res.status == true) {
        // this.notyf.success(res.message || 'Dashboard data loaded successfully')
        this.stats = res.data.stats;
        this.branchList = res.data
      } else if (res.status == 'expired') {
        this.router.navigate(['login'])
      } else {
        this.notyf.error(res.message || 'Something went wrong')
      }
    },
      (error: any) => {
        console.error('Error loading employees:', error);
        this.notyf.error(error?.error?.message)
        // alert('Failed to load employees. Please try again.');
      });
  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  listflag: boolean = true;
  personalDetails: any = {}
  profileImagePreview: string | null = null;
  selectedProfileFile: File | null = null;
  readonly defaultPendingAvatar = 'assets/img/marketing/gens-logo.png';
  cameraOpen = false;
  cameraBusy = false;
  cameraError: string | null = null;
  private cameraStream: MediaStream | null = null;

  opencreate() {
    this.closeAdminCamera();
    this.personalDetails = {}
    this.profileImagePreview = null;
    this.selectedProfileFile = null;
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
  }

  onProfilePhotoPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.closeAdminCamera();
    const ok = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!ok.includes(file.type)) {
      this.notyf.error('Only JPG or PNG images are allowed.');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notyf.error('Maximum image size is 2 MB.');
      input.value = '';
      return;
    }
    this.applyPickedFile(file);
    input.value = '';
  }

  private applyPickedFile(file: File): void {
    this.selectedProfileFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.profileImagePreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  async openAdminCamera(): Promise<void> {
    this.cameraError = null;
    this.cameraOpen = true;
    this.cameraBusy = false;
    await new Promise((r) => setTimeout(r, 50));
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser.');
      }
      this.stopCameraStream();
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
      });
      const video = this.adminCameraVideo?.nativeElement;
      if (!video) {
        throw new Error('Camera view not ready. Try again.');
      }
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.srcObject = this.cameraStream;
      await video.play().catch(() => undefined);
    } catch (e: any) {
      this.cameraError = e?.message || 'Unable to open camera. Allow camera permission or use gallery.';
      this.stopCameraStream();
    }
  }

  closeAdminCamera(): void {
    this.stopCameraStream();
    this.cameraOpen = false;
    this.cameraBusy = false;
    this.cameraError = null;
  }

  private stopCameraStream(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }
    const video = this.adminCameraVideo?.nativeElement;
    if (video) video.srcObject = null;
  }

  async captureAdminPhoto(): Promise<void> {
    if (this.cameraBusy) return;
    this.cameraBusy = true;
    this.cameraError = null;
    try {
      const video = this.adminCameraVideo?.nativeElement;
      if (!video || !this.cameraStream || video.videoWidth < 2) {
        throw new Error('Camera not ready yet. Wait a moment and try again.');
      }
      const outW = 480;
      const outH = 640;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not capture frame.');

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const targetRatio = outW / outH;
      const srcRatio = vw / vh;
      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;
      if (srcRatio > targetRatio) {
        sw = Math.round(vh * targetRatio);
        sx = Math.round((vw - sw) / 2);
      } else {
        sh = Math.round(vw / targetRatio);
        sy = Math.round((vh - sh) / 2);
      }
      // Mirror to match preview
      ctx.translate(outW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
      );
      if (!blob) throw new Error('Capture failed.');
      const file = new File([blob], `live_${Date.now()}.jpg`, { type: 'image/jpeg' });
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Captured image is too large. Try again.');
      }
      this.applyPickedFile(file);
      this.closeAdminCamera();
      this.notyf.success('Photo captured. Save / approve to upload.');
    } catch (e: any) {
      this.cameraError = e?.message || 'Capture failed.';
      this.notyf.error(this.cameraError);
    } finally {
      this.cameraBusy = false;
    }
  }

  clearProfilePhotoPick(): void {
    this.selectedProfileFile = null;
    const raw = this.personalDetails?.profileImageRaw;
    this.profileImagePreview = raw
      ? `${this.baseurl}${raw}`
      : this.personalDetails?.gender === 'Female'
        ? '../../assets/img/avatars/2.png'
        : this.defaultPendingAvatar;
  }

  onProfileImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && !img.src.includes('gens-logo.png')) {
      img.src = this.defaultPendingAvatar;
    }
  }

  private uploadPendingPhoto(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.selectedProfileFile || !this.personalDetails?.id) {
        resolve(true);
        return;
      }
      const fd = new FormData();
      fd.append('id', this.personalDetails.id);
      fd.append('employeeId', this.personalDetails.id);
      fd.append('name', this.personalDetails.firstName || 'employee');
      fd.append('profileImage', this.selectedProfileFile, this.selectedProfileFile.name);
      this.employeeService.uploadImage(fd).subscribe({
        next: (response: any) => {
          const message = response?.message || 'Photo updated';
          const status = this.statusService.handleResponseStatus(response?.status, message);
          if (status === true) {
            const filename = response?.data?.profileImage;
            if (filename) {
              this.personalDetails.profileImageRaw = filename;
              this.profileImagePreview = `${this.baseurl}${filename}`;
            }
            this.selectedProfileFile = null;
            resolve(true);
          } else if (status === 'expired') {
            this.notyf.error(message);
            this.router.navigate(['login']);
            resolve(false);
          } else {
            this.notyf.error(message || 'Failed to upload photo');
            resolve(false);
          }
        },
        error: (err) => {
          this.notyf.error(err?.error?.message || err?.message || 'Failed to upload photo');
          resolve(false);
        },
      });
    });
  }
  countryList: any = [];
  employmentTypes: any[] = [];
  async countrydd() {
    this.countryList = [];
    this.employeeService.getCountry().subscribe((data: any) => {
      if (Array.isArray(data)) {
        this.countryList = data;
        console.log(this.countryList);
      } else if (data && data.status === false) {
        alert(data.message);
        return;
      } else if (data && data.data) {
        this.countryList = data.data;
        console.log(this.countryList);
      }
    });
  }
  // async getEmploymentTypes() {
  //   this.employmentTypes = [];
  //   this.master.getEmploymentTypes().subscribe(data => {
  //     this.employmentTypes = data;
  //     console.log(this.employmentTypes);
  //   }
  //   );
  // }
  states: any[] = [];
  async getstates(countryId: any) {
    this.states = []
    let obj: any = {}
    obj['id'] = countryId.value || countryId;

    this.employeeService.getStates(obj).subscribe(data => {
      this.states = data.data || [];
      console.log(this.states);
    }

    );
  }
  cities: any = []
  async getcity(stateId: any) {
    this.cities = [];
    let obj: any = {}
    obj['id'] = stateId.value || stateId;
    if (obj) {
      // Implement the logic to fetch cities based on the selected state
      this.employeeService.getCities(obj).subscribe(data => {
        this.cities = data.data || [];
        console.log(this.cities);
      });
    }
  }


  getUserStatusClass(status: any): string {
    switch (status) {
      case 'approved': return 'badge-outline-success';
      case 'pending': return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }

  shift: any = [{ value: 'Day', label: 'Day' }, { value: 'Afternoon', label: 'Afternoon' }, { value: 'Night', label: 'Night' }]
  role: any = [{ value: 'manager', label: 'Manager' }, { value: 'teamLeader', label: 'Team Leader' }, { value: 'employee', label: 'employee' }]

  maritalStatusList = [
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' },
    { value: 'Separated', label: 'Separated ' }
  ];
  genderList = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' }
  ]
  preventMoreThanTenDigits(event: KeyboardEvent, value: string): void {
    const isDigit = /^[0-9]$/.test(event.key);
    if (!isDigit || (value && value.length >= 10)) {
      event.preventDefault();
    }
  }
  adhaarvalidaiton(event: KeyboardEvent, value: string): void {
    const isDigit = /^[0-9]$/.test(event.key);
    // count digits only; the formatted value contains spaces
    const digits = String(value || '').replace(/\D/g, '');
    if (!isDigit || digits.length >= 12) {
      event.preventDefault();
    }
  }

  onAadhaarInput(event: any, separator: 'space' | 'dash' = 'space'): void {
    let input = event.target.value.replace(/\D/g, '').substring(0, 12); // only digits, max 12
    let formatted = '';

    // Choose separator: space or dash
    const sep = separator === 'dash' ? '-' : ' ';

    for (let i = 0; i < input.length; i += 4) {
      if (i > 0) formatted += sep;
      formatted += input.substr(i, 4);
    }

    // this.formattedAadhaar = formatted;
    this.personalDetails.adhaarNo = formatted; // store raw 12-digit Aadhaar number
  }
  toUppercase() {
    this.personalDetails.panNo = this.personalDetails.panNo?.toUpperCase() || '';
  }
  validateField(value: any, fieldName: string): boolean {
    if (!value || value.toString().trim() === '') {
      this.notyf.error(`Please enter a valid ${fieldName}`);
      return false;
    }
    return true;
  }

  /** Multi-select branches → keep primary branchId as first selected (API/cascade). */
  syncPrimaryBranch(branchIds: any): string | null {
    const ids = Array.isArray(branchIds)
      ? branchIds.filter(Boolean)
      : (branchIds ? [branchIds] : []);
    this.personalDetails['branchIds'] = ids;
    const primary = ids.length ? ids[0] : null;
    this.personalDetails['branchId'] = primary;
    return primary;
  }

  async onBranchChange(branchIds: any) {
    this.syncPrimaryBranch(branchIds);
    this.personalDetails['departmentId'] = null;
    this.personalDetails['designationId'] = null;
    this.personalDetails['reportingPersonId'] = null;
    this.personalDetails['empType'] = null;
    await this.DepartmentDD();
    await this.getEmploymentTypes();
    this.loadReportingPersons();
  }

  /** Reporting person options: active employees of the branch being assigned. */
  loadReportingPersons() {
    this.employeeList = [];
    const branchId = this.personalDetails['branchId'];
    if (!branchId) return;
    this.employeeService.getEmp(branchId).subscribe({
      next: (response: any) => {
        if (response?.status === true) {
          this.employeeList = (response.data?.formattedActiveEmps || [])
            .filter((item: any) => item.id != this.personalDetails.id)
            .map((item: any) => ({
              value: item.id,
              label: `${item?.empCode || ''}-${item.firstName} ${item?.lastName || ''}`
            }));
        }
      },
      error: (err: any) => console.error('Error loading reporting persons:', err),
    });
  }

  bloodGroupList = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }));
  readonly multiBranchRoles = ['director', 'manager'];

  /** Multiple branches are only meaningful for roles with multi-branch access. */
  get allowMultiBranch(): boolean {
    return this.multiBranchRoles.includes(String(this.personalDetails?.role || '').toLowerCase());
  }

  onRoleChange() {
    const ids = this.personalDetails['branchIds'] || [];
    if (!this.allowMultiBranch && ids.length > 1) {
      this.syncPrimaryBranch([ids[0]]);
      this.notyf.error('Only Director or Manager roles can be assigned to multiple branches. Kept the first selected branch.');
    }
  }

  isValidEmail(value: any): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  /** Optional: empty OK; if filled must be 12 digits. */
  isValidAadhaar(value: any): boolean {
    const raw = String(value || '').replace(/\D/g, '');
    if (!raw) return true;
    return raw.length === 12;
  }

  /** Optional: empty OK; if filled must match PAN format. */
  isValidPan(value: any): boolean {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) return true;
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(raw);
  }
  async update(data: any) {

    this.personalDetails = Object.assign({}, data);
    const rawPhoto = data?.profileImageRaw || null;
    this.personalDetails.profileImageRaw = rawPhoto;
    // Don't send full CDN URL back to updateEmp
    this.personalDetails.profileImage = rawPhoto;
    this.selectedProfileFile = null;
    this.profileImagePreview = rawPhoto
      ? `${this.baseurl}${rawPhoto}`
      : data?.gender === 'Female'
        ? '../../assets/img/avatars/2.png'
        : this.defaultPendingAvatar;
    const dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1).toString().padStart(2, '0')}-${dob.getDate().toString().padStart(2, '0')}`;;
    this.personalDetails.dateOfBirth = formattedDob;
    this.personalDetails.state = Number(this.personalDetails.state);
    this.personalDetails.city = Number(this.personalDetails.city);
    this.personalDetails.country = Number(this.personalDetails.country);
    let loadedBranchIds: any[] = [];
    const rawBranchIds = data?.branchIds ?? this.personalDetails.branchIds;
    if (Array.isArray(rawBranchIds) && rawBranchIds.length) {
      loadedBranchIds = rawBranchIds.filter(Boolean);
    } else if (typeof rawBranchIds === 'string' && rawBranchIds.trim()) {
      try {
        const parsed = JSON.parse(rawBranchIds);
        loadedBranchIds = Array.isArray(parsed) ? parsed.filter(Boolean) : [rawBranchIds];
      } catch {
        loadedBranchIds = [rawBranchIds];
      }
    } else if (this.personalDetails.branchId) {
      loadedBranchIds = [this.personalDetails.branchId];
    }
    this.syncPrimaryBranch(loadedBranchIds);
    await this.getstates(this.personalDetails.country);
    await this.getcity(this.personalDetails.state);
    await this.DepartmentDD();
    await this.getEmploymentTypes();
    if (this.personalDetails.departmentId) {
      await this.getDesignation(this.personalDetails.departmentId);
    }
    this.loadReportingPersons();
    this.closeAdminCamera();
    this.createFlag = true;
    this.updateFlag = true;
  }
  async updateform() {
    const d = this.personalDetails;
    if (
      !this.validateField(d.firstName, 'First Name') ||
      !this.validateField(d.lastName, 'Last Name') ||
      !this.validateField(d.mobile, 'Mobile Number') ||
      !this.validateField(d.email, 'Email') ||
      !this.validateField(d.dateOfBirth, 'Date of Birth')
    ) {
      return;
    }
    if (!d.email || !String(d.email).trim()) {
      this.notyf.error('Email is required');
      return;
    }
    if (!this.isValidEmail(d.email)) {
      this.notyf.error('Please enter a valid email address');
      return;
    }
    if (!this.isValidAadhaar(d.adhaarNo)) {
      this.notyf.error('Please enter a valid 12 digit Aadhaar number');
      return;
    }
    if (!this.isValidPan(d.panNo)) {
      this.notyf.error('Please enter a valid PAN (e.g., ABCDE1234F)');
      return;
    }
    const selectedBranches = this.personalDetails['branchIds'] || [];
    if (!this.syncPrimaryBranch(selectedBranches.length ? selectedBranches : this.personalDetails['branchId'])) {
      this.notyf.error('Please select a Branch before approving');
      return;
    }
    if (!this.allowMultiBranch && (this.personalDetails['branchIds'] || []).length > 1) {
      this.notyf.error('Only Director or Manager roles can be assigned to multiple branches. Please select a single branch.');
      return;
    }

    const photoOk = await this.uploadPendingPhoto();
    if (!photoOk) return;

    const dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;;
    const obj = Object.assign({}, this.personalDetails);
    obj.dateOfBirth = formattedDob;
    obj.adhaarNo = obj.adhaarNo ? String(obj.adhaarNo).replace(/\D/g, '') : obj.adhaarNo;
    obj.panNo = obj.panNo ? String(obj.panNo).trim().toUpperCase() : obj.panNo;
    obj.email = String(obj.email || '').trim();
    obj.emp_status='approved'
    obj.type = 'pending_employee'
    obj.branchId = this.personalDetails['branchId'];
    obj.branchIds = this.personalDetails['branchIds'] || [];
    obj.profileImage = this.personalDetails.profileImageRaw || this.personalDetails.profileImage || null;
    delete obj.profileImageRaw;
    delete obj.si_no;

    this.employeeService.updateEmp(obj).subscribe(
      (response) => {

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.reset();
          this.loadEmployees()
        } else if (status === "expired") {
          this.notyf.error(message);
          this.router.navigate(["login"]);
        }
        else {
          this.notyf.error(message);
        }


      },
      (error) => {
        console.error('Error adding employee:', error);
        let errorMessage = error?.error?.message ? error?.error?.message : error?.message
        this.notyf.error(errorMessage || 'Failed to add employee. Please try again.');
      }

    )

  }


  reset() {
    this.personalDetails = {};
    this.profileImagePreview = null;
    this.selectedProfileFile = null;
    this.createFlag = false;
    this.listflag = true;
    this.updateFlag = false;
  }
  onSearch(term: string) {
    if (!term) {
      this.searchText = ''
      this.loadEmployees()
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
    this.pageSize = Number(size) || 10;
    this.currentPage = 1;
    this.applyFilters();
  }


}
