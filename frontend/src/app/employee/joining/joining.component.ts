import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { Notyf } from 'notyf';
import { Router } from '@angular/router';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { DataService } from '../../services/data.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-joining',
  imports: [FormsModule, CommonModule, NgSelectModule, SearchPaginationComponent],
  templateUrl: './joining.component.html',
  styleUrl: './joining.component.css'
})
export class JoiningComponent {
  @ViewChild(SearchPaginationComponent) searchPaginationRef?: SearchPaginationComponent;
  notyf: Notyf
  maxDate: any
  constructor(public dataService: DataService, private employeeService: EmployeeService, private master: MasterService, public statusService: StatusService, private router: Router,) {
    this.notyf = new Notyf();
    const today = new Date();
    const year = today.getFullYear() - 18;
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.maxDate = `${year}-${month}-${day}`;
  }
  shift: any = [{ value: 'Day', label: 'Day' }, { value: 'Afternoon', label: 'Afternoon' }, { value: 'Night', label: 'Night' }]
  role: any = [
    { value: 'director', label: 'Director' },
    { value: 'manager', label: 'Manager' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'teamLeader', label: 'Team Leader' },
    { value: 'employee', label: 'Employee' },
  ]

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
  createFlag: boolean = false;
  baseurl: any;
  async ngOnInit() {
    await this.countrydd();
    await this.loadEmployees();
    await this.getEmploymentTypes();
    await this.DepartmentDD()
    await this.applyFilters()
    await this. getBranchDD()
    this.baseurl = this.master.getBaseUrl();
  }

  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
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
  filteredDesignation: any = []
  searchText: any = ''
  originalList: any = []
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

  /** Clears any active search filter, e.g. after data has been added/edited/deleted. */
  clearSearch(): void {
    this.searchTerm = '';
    this.searchText = '';
    this.currentPage = 1;
    this.searchPaginationRef?.resetSearch();
  }

  onMobileChange() {
    const mobile = String(this.personalDetails.mobile || '');
    if (mobile.length !== 10 || this.updateFlag) return; // edit mode skip optional

    this.employeeService.checkEmpByMobile({ mobile }).subscribe({
      next: async (res: any) => {
        if (!res?.status) return;

        const emp = res.data;
        if (!emp) return; // new number

        if (emp.emp_status === 'approved') {
          this.notyf.error('Phone number already exists');
          this.personalDetails.mobile = '';
          return;
        }

        if (emp.emp_status === 'pending') {
          // Self-registered candidate awaiting approval: don't create a duplicate.
          const result = await Swal.fire({
            title: 'Pending registration found',
            text: `${emp.firstName || ''} ${emp.lastName || ''} has already registered and is awaiting approval. Load their details to review and approve?`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Load & review',
            cancelButtonText: 'Cancel',
          });
          if (!result.isConfirmed) {
            this.personalDetails.mobile = '';
            return;
          }
          await this.update(emp); // existing fill method ~line 513
          this.approvingPending = true;
          if (!this.personalDetails['branchId']) {
            const currentBranchId = localStorage.getItem('branchId');
            if (currentBranchId && currentBranchId !== 'null') this.syncPrimaryBranch([currentBranchId]);
          }
          this.notyf.success('Pending employee data loaded. Click Update to approve.');
          return;
        }

        // Same mobile already used by an employee in this branch
        this.notyf.error('Phone number already exists');
        this.personalDetails.mobile = '';
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Check failed'),
    });
  }

  async getEmploymentTypes() {
    let obj:any={}
    obj["branchId"]=this.personalDetails["branchId"]
    this.employmentTypes = [];
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
  listflag: boolean = true;
  updateFlag: boolean = false;
  /** True when the form was filled from a self-registration that is pending approval. */
  approvingPending: boolean = false;
  bloodGroupList = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }));
  readonly multiBranchRoles = ['director', 'manager'];
  opencreate() {
    this.personalDetails = {}
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
    this.approvingPending = false
    this.buildReportingOptions()
    // New employees belong to the branch currently selected in the header.
    const currentBranchId = localStorage.getItem('branchId');
    if (currentBranchId && currentBranchId !== 'null') {
      this.syncPrimaryBranch([currentBranchId]);
      this.DepartmentDD();
      this.getEmploymentTypes();
    }
  }

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

  isValidMobile(value: any): boolean {
    return /^[6-9]\d{9}$/.test(String(value || '').trim());
  }

  /** Shared create/update validation. Returns false (and shows a message) when invalid. */
  validateEmployeeForm(): boolean {
    const d = this.personalDetails;
    if (
      !this.validateField(d.firstName, 'First Name') ||
      !this.validateField(d.lastName, 'Last Name') ||
      !this.validateField(d.mobile, 'Mobile Number') ||
      !this.validateField(d.email, 'Email') ||
      !this.validateField(d.dateOfBirth, 'Date of Birth')
    ) {
      return false;
    }
    if (!this.isValidMobile(d.mobile)) {
      this.notyf.error('Please enter a valid 10 digit mobile number');
      return false;
    }
    if (d.alternateMobile && !this.isValidMobile(d.alternateMobile)) {
      this.notyf.error('Please enter a valid 10 digit alternate mobile number');
      return false;
    }
    if (!this.isValidEmail(d.email)) {
      this.notyf.error('Please enter a valid email address');
      return false;
    }
    if (!this.isValidAadhaar(d.adhaarNo)) {
      this.notyf.error('Please enter a valid 12 digit Aadhaar number');
      return false;
    }
    if (!this.isValidPan(d.panNo)) {
      this.notyf.error('Please enter a valid PAN (e.g., ABCDE1234F)');
      return false;
    }
    const branchIds = this.personalDetails['branchIds'] || [];
    if (!this.syncPrimaryBranch(branchIds.length ? branchIds : this.personalDetails['branchId'])) {
      this.notyf.error('Please select a Branch');
      return false;
    }
    if (!this.allowMultiBranch && (this.personalDetails['branchIds'] || []).length > 1) {
      this.notyf.error('Only Director or Manager roles can be assigned to multiple branches. Please select a single branch.');
      return false;
    }
    if (d.isContractual && !(Number(d.hourlyRate) > 0)) {
      this.notyf.error('Please enter a valid hourly rate for a contractual employee');
      return false;
    }
    return true;
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

getStateDistrict(pin_code: any) {
  if (!pin_code) return;

  let obj: any = {
    pin_code: pin_code
  };

  this.employeeService.getStatesDistrict(obj).subscribe({
    next: (data: any) => {
      this.personalDetails['state'] = data?.data?.state_name || '';
      this.personalDetails['city'] = data?.data?.district_name || '';
    },
    error: (err) => {
      console.error('Error fetching state/district:', err);
    }
  });
}
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
  }

  preventMoreThanTenDigits(event: KeyboardEvent, value: string): void {
    const isDigit = /^[0-9]$/.test(event.key);
    if (!isDigit || (value && value.length >= 10)) {
      event.preventDefault();
    }
  }
  adhaarvalidaiton(event: KeyboardEvent, value: string): void {
    const isDigit = /^[0-9]$/.test(event.key);
    const digits = String(value || '').replace(/\D/g, '');
    if (!isDigit || digits.length >= 12) {
      event.preventDefault();
    }
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

  validateField(value: any, fieldName: string): boolean {
    if (!value || value.toString().trim() === '') {
      this.notyf.error(`Please enter a valid ${fieldName}`);
      return false;
    }
    return true;
  }
  personalDetails: any = {}
  submitForm() {
    // if (
    //   !this.validateField(this.personalDetails.firstName, 'First Name') ||
    //   !this.validateField(this.personalDetails.lastName, 'Last Name') ||
    //   !this.validateField(this.personalDetails.email, 'Email') ||
    //   !this.validateField(this.personalDetails.mobile, 'Mobile Number') ||
    //   !this.validateField(this.personalDetails.adhaarNo, 'Aadhaar Number') ||
    //   !this.validateField(this.personalDetails.dateOfBirth, 'Date of Birth') ||
    //   !this.validateField(this.personalDetails.currentAddress, 'Current Address') ||
    //   !this.validateField(this.personalDetails.permanentAddress, 'Permanent Address') ||
    //   !this.validateField(this.personalDetails.city, 'City') ||
    //   !this.validateField(this.personalDetails.gender, 'Gender') ||
    //   !this.validateField(this.personalDetails.martialStatus, 'Marital Status') ||
    //   !this.validateField(this.personalDetails.shift_id, 'Shift')
    // ) {
    //   return;
    // }

    if (!this.validateEmployeeForm()) {
      return;
    }
    let aadhaarRaw: string | undefined;
    if (this.personalDetails.adhaarNo) {
      aadhaarRaw = this.personalDetails.adhaarNo.replace(/\D/g, '');
    }
    const dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;;
    let obj: any = {}
    obj = Object.assign({}, this.personalDetails);
    obj.dateOfBirth = formattedDob;
    obj.adhaarNo = aadhaarRaw
    obj.branchId = this.personalDetails['branchId'];
    obj.branchIds = this.personalDetails['branchIds'] || [];
    this.employeeService.createEmp(obj).subscribe(
      (response) => {

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status == true) {
          obj = {}
          this.notyf.success(message)
          this.reset();
          this.loadEmployees()
        } else if (status === "expired") {
          obj = {}
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
        this.notyf.error(errorMessage);
        // alert('Failed to add employee. Please try again.');
      }

    )



  }
  departmentDD: any = []
  async DepartmentDD() {

    this.departmentDD = []
    let obj:any={}
    obj['branchId'] = this.personalDetails['branchId'] ? this.personalDetails['branchId']  :null

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
    obj['branchId'] = this.personalDetails['branchId'] ? this.personalDetails['branchId']  :null
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
        this.notyf.error(err)
      }
    });
  }
  employees: any = []
  employeeList: any = []
  reportingPersonList: any[] = []
  allBranchEmployees: any[] = []
  cardData: any = {}

  /** Reporting person options for the open form: active employees except the one being edited. */
  buildReportingOptions(currentEmpId?: any) {
    const options = this.reportingPersonList.filter((item: any) => item.value != currentEmpId);
    // Keep an already-assigned (e.g. now inactive) reporting person visible instead of a blank field.
    const assignedId = this.personalDetails?.reportingPersonId;
    if (assignedId && !options.some((o: any) => o.value == assignedId)) {
      const assigned = this.allBranchEmployees.find((e: any) => e.id == assignedId);
      if (assigned) {
        options.push({
          value: assigned.id,
          label: `${assigned?.empCode || ''}-${assigned.firstName} ${assigned?.lastName || ''}`
        });
      }
    }
    this.employeeList = options;
  }
  async loadEmployees() {
    this.clearSearch();
    // this.filteredDesignation = []
    this.employees = []
    this.employeeList = []
    this.cardData = []
    this.originalList = []
    this.employeeService.getEmp().subscribe((response: any) => {
      if (response && response.data && response.status === true) {
        // this.notyf.success(response.message || 'Employees loaded successfully');
        this.employees = [];
        this.cardData = response.data.cardData
        // Reporting person options: all active employees of the branch,
        // regardless of which summary card (Active/Total/Inactive/New) is selected.
        this.allBranchEmployees = response.data.formattedEmps || [];
        this.reportingPersonList = (response.data.formattedActiveEmps || []).map((item: any) => ({
          value: item.id,
          label: `${item?.empCode || ''}-${item.firstName} ${item?.lastName || ''}`
        }));
          if (this.totalEmpFlag == true) {
          this.employees = response.data.formattedEmps || [];
          this.originalList = response.data.formattedEmps || [];
          this.employeeList = response.data?.formattedEmps?.map((item: any) => ({
            value: item.id,
            label: `${item?.empCode}-${item.firstName} ${item?.lastName || ''}`
          }));
        }
        if (this.activeFlag == true) {
          this.employees = response.data.formattedActiveEmps || [];
          this.originalList = response.data.formattedActiveEmps || [];
          this.employeeList = response.data?.formattedActiveEmps?.map((item: any) => ({
            value: item.id,
            label: `${item?.empCode}-${item.firstName} ${item?.lastName || ''}`
          }));
        }
        else if (this.inActiveFlag == true) {
          this.employees = response.data.formattedInactivemps || [];
          this.originalList = response.data.formattedInactivemps || [];
          this.employeeList = response.data?.formattedInactivemps?.map((item: any) => ({
            value: item.id,
            label: `${item?.empCode}-${item.firstName} ${item?.lastName || ''}`
          }));
        }
        else if (this.newJoinerFlag == true) {
          this.employees = response.data.formattednewJoinermps || [];
          this.originalList = response.data.formattednewJoinermps || [];
          this.employeeList = response.data?.formattednewJoinermps?.map((item: any) => ({
            value: item.id,
            label: `${item?.empCode}-${item.firstName} ${item?.lastName || ''}`
          }));
        }

        this.employees = this.employees.map((item: any, index: any) => {
          return {
            ...item,
            si_no: index + 1,
            profileImage: item.profileImage ? `${this.baseurl}${item?.profileImage}` : item.gender == 'Female' ? "../../assets/img/avatars/2.png" : '../../assets/img/avatars/1.png'
          }
        })
        this.originalList = this.originalList.map((item: any, index: any) => {
          return {
            ...item,
            si_no: index + 1,
            profileImage: item.profileImage ? `${this.baseurl}${item?.profileImage}` : item.gender == 'Female' ? "../../assets/img/avatars/2.png" : '../../assets/img/avatars/1.png'

          }
        })

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
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  async update(data: any) {

    this.personalDetails = Object.assign({}, data);
    const dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1).toString().padStart(2, '0')}-${dob.getDate().toString().padStart(2, '0')}`;;
    this.personalDetails.dateOfBirth = formattedDob;
    // this.personalDetails.state = Number(this.personalDetails.state);
    // this.personalDetails.city = Number(this.personalDetails.city);
    this.personalDetails.country = this.personalDetails.country ? Number(this.personalDetails.country) : null;
    // Prefill multi-branch from saved branchIds (fallback: primary branchId)
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
    await this.getStateDistrict(this.personalDetails.pinCode);
    // await this.getstates(this.personalDetails.country);
    // await this.getcity(this.personalDetails.state);
    await this.DepartmentDD();
    await this.getEmploymentTypes();
    await this.getDesignation(this.personalDetails.departmentId);
    this.buildReportingOptions(this.personalDetails.id);


    this.createFlag = true;
    this.updateFlag = true;
  }

  inActiveFlag: any = false
  activeFlag: any = true
  newJoinerFlag: any = false
  totalEmpFlag: any = false

  async checkStatus() {
    this.inActiveFlag = true
    this.activeFlag = false
    this.newJoinerFlag = false
    this.totalEmpFlag=false
    await this.loadEmployees()
  }
  async checkTotalEmp() {
    this.totalEmpFlag=true
    this.inActiveFlag = false
    this.activeFlag = false
    this.newJoinerFlag = false
    await this.loadEmployees()
  }
  async checknewJoiner() {
    this.inActiveFlag = false
    this.activeFlag = false
    this.newJoinerFlag =true
    this.totalEmpFlag=false
    await this.loadEmployees()
  }
  async checkActiveStatus() {
    this.inActiveFlag = false
    this.newJoinerFlag = false
    this.activeFlag = true
    this.totalEmpFlag=false
    await this.loadEmployees()
  }
  updateform() {
    // Validate before leaving the form so the user keeps their edits on error.
    if (!this.validateEmployeeForm()) {
      return;
    }
    let dob: any;
    let obj: any =Object.assign({}, this.personalDetails);

    //  if(!this.personalDetails.dateOfBirth){
       dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;;
     obj = Object.assign({}, this.personalDetails);
    obj.dateOfBirth = formattedDob;
    //  }
    if (this.approvingPending) {
      // Same approval call the Pending Employee List uses.
      obj.emp_status = 'approved';
      obj.type = 'pending_employee';
    }
    let aadhaarRaw: any;
    if (obj.adhaarNo) {
      aadhaarRaw = obj.adhaarNo.replace(/\D/g, '');
    }
    obj.adhaarNo = aadhaarRaw;
    if (obj.panNo) {
      obj.panNo = String(obj.panNo).trim().toUpperCase();
    }
    obj.branchId = this.personalDetails['branchId'];
    obj.branchIds = this.personalDetails['branchIds'] || [];
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
        this.notyf.error(errorMessage||'Failed to add employee. Please try again.');
        // console.error('Error adding employee:', error);
        // this.notyf.error('Failed to add employee. Please try again.');
      }

    )

  }
  enableDisableLoc(data: any, type: any) {
     let Enable;
    if (type == "location") {
      Enable = data?.isLocation == true ? 'Disable' : 'Enable'
    }
    else if(type=="attendanceAllTime"){
       Enable = data?.isofflineAllTimeAtt == true ? 'Disable' : 'Enable'
    }
    else {
      Enable = data?.isofflineAtt == true ? 'Disable' : 'Enable'
    }

    Swal.fire({
      title: "Are you sure?",
      text: `Do you Want to ${Enable} this`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes,  ${Enable}  it!`,
      cancelButtonText: "No, cancel!",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.activeLocation(data, type);
      } else if (result.dismiss === Swal.DismissReason.cancel) {

      }
    });



  }
  delete(data: any) {

    Swal.fire({
      title: "Are you sure?",
      text: "Do you Want to Delete this",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteConfirm(data);
      } else if (result.dismiss === Swal.DismissReason.cancel) {

      }
    });



  }
  deleteConfirm(data: any) {
    this.employeeService.deleteEmp(data).subscribe(
      (response) => {
        console.log('Employee deleted successfully:', response);
        if (response && response.status === true) {
          this.loadEmployees();
          this.notyf.success(response.message || 'Employee deleted successfully');
        }
        else if (response && response.status == false) {
          this.notyf.error(response.message || 'Failed to delete employee');
        }
        else {
          this.notyf.error('Failed to delete employee');
        }

      },
      (error) => {
        console.error('Error deleting employee:', error);
        this.notyf.error('Failed to delete employee');
      }
    )
  }

  reset() {
    this.personalDetails = {};
    this.createFlag = false;
    this.listflag = true;
    this.updateFlag = false;
    this.approvingPending = false;
  }
  back() {
    this.personalDetails = {}
    this.createFlag = false
    this.updateFlag = false
    this.approvingPending = false
    // The list (and its search box) is re-created empty, so drop any old
    // search filter too; otherwise only the previously matched rows show.
    this.clearSearch();
    this.applyFilters();
  }
  toUppercase() {
    this.personalDetails.panNo = this.personalDetails.panNo?.toUpperCase() || '';
  }

  activeLocation(data: any, type: any) {
    let obj = Object.assign({}, data)
    if (type == "attendance") {
      obj['isofflineAtt'] = !obj['isofflineAtt']
    }
    else if(type=="attendanceAllTime"){
     obj['isofflineAllTimeAtt'] = !obj['isofflineAllTimeAtt']
     if(obj['isofflineAllTimeAtt']){
        obj['isofflineAtt'] =true
     }
    }
    else {
      obj['isLocation'] = !obj['isLocation']
    }

    this.employeeService.activeLocation(obj).subscribe(
      (response) => {
        console.log('Employee deleted successfully:', response);
        if (response && response.status === true) {
          this.loadEmployees();
          this.notyf.success(response.message || 'Employee deleted successfully');
        }
        else if (response && response.status == false) {
          this.notyf.error(response.message || 'Failed to delete employee');
        }
        else {
          this.notyf.error('Failed to delete employee');
        }

      },
      (error) => {
        console.error('Error deleting employee:', error);
        this.notyf.error('Failed to delete employee');
      }
    )


  }

  /** Employee List "Assign Branches" dialog state (null = closed). */
  branchAssign: {
    id: string;
    name: string;
    roleLabel: string;
    homeId: string | null;
    multi: boolean;
    selected: string[];
    saving: boolean;
  } | null = null;

  openAssignBranches(item: any): void {
    const homeId = item?.branchId ? String(item.branchId) : null;
    let saved: any = item?.branchIds;
    if (typeof saved === 'string') {
      try { saved = JSON.parse(saved); } catch { saved = [saved]; }
    }
    const selected = [...new Set([...(homeId ? [homeId] : []), ...(Array.isArray(saved) ? saved.map(String) : [])])];
    const role = String(item?.role || '');
    this.branchAssign = {
      id: item.id,
      name: `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Employee',
      roleLabel: (this.role || []).find((r: any) => r.value === role)?.label || role || 'No role',
      homeId,
      multi: this.multiBranchRoles.includes(role.toLowerCase()),
      selected,
      saving: false,
    };
  }

  closeAssignBranches(): void {
    if (!this.branchAssign?.saving) this.branchAssign = null;
  }

  get allBranchesAssigned(): boolean {
    const all = (this.branchList || []).map((b: any) => String(b.id));
    return !!this.branchAssign && all.length > 0 && all.every((id: string) => this.branchAssign!.selected.includes(id));
  }

  toggleAllBranches(on: boolean): void {
    if (!this.branchAssign) return;
    const home = this.branchAssign.homeId;
    this.branchAssign.selected = on
      ? (this.branchList || []).map((b: any) => String(b.id))
      : home ? [home] : [];
  }

  toggleBranch(id: string, on: boolean): void {
    if (!this.branchAssign || id === this.branchAssign.homeId) return;
    const rest = this.branchAssign.selected.filter((x) => x !== id);
    this.branchAssign.selected = on ? [...rest, id] : rest;
  }

  saveAssignBranches(): void {
    const a = this.branchAssign;
    if (!a || a.saving) return;
    a.saving = true;
    const body = this.allBranchesAssigned
      ? { employeeId: a.id, all: true }
      : { employeeId: a.id, branchIds: a.selected };
    this.employeeService.assignBranches(body).subscribe({
      next: (res: any) => {
        a.saving = false;
        if (res?.status === true) {
          this.notyf.success(`${res.data?.branchIds?.length || a.selected.length} branch(es) assigned to ${a.name}`);
          this.branchAssign = null;
          this.loadEmployees();
        } else {
          this.notyf.error(res?.message || 'Could not assign branches');
        }
      },
      error: (err: any) => {
        a.saving = false;
        this.notyf.error(err?.error?.message || 'Could not assign branches');
      },
    });
  }

  view(data: any) {
    console.log(data, "objectsss")
    // Save object
    data.state = Number(data.state);
    data.city = Number(data.city);
    data.country = Number(data.country);
    localStorage.setItem('employeeId', JSON.stringify(data));

    this.router.navigate(['/layout/employee/add']);
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

    getStatusClass(status: any): string {
    switch (status) {
      case true: return 'badge-outline-success';
      case false: return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }
     getUserStatusClass(status: any): string {
    switch (status) {
      case 'active': return 'badge-outline-success';
      case 'inactive': return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }
}
