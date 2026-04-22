import { Component } from '@angular/core';
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
@Component({
  selector: 'app-pending-emp-list',
  imports: [FormsModule, CommonModule, NgSelectModule, SearchPaginationComponent],
  templateUrl: './pending-emp-list.component.html',
  styleUrl: './pending-emp-list.component.css'
})
export class PendingEmpListComponent {
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
    this.personalDetails = {}
    this.createFlag = false
    this.employeeList = this.employees?.map((item: any) => ({
      value: item.id,
      label: `${item.firstName} ${item?.lastName || ''}`
    }));
  }
  applyFilters() {
    let data = [...this.employees];
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
    this.filteredDesignation = data.slice(start, end);
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
      if (response && response.data && response.status === true) {
        // this.notyf.success(response.message || 'Employees loaded successfully');
        this.employees = [];
        // this.cardData = response.data.cardData
        if (this.totalEmpFlag == true) {
          this.employees = response.data || [];
          this.originalList = response.data || [];
          this.employeeList = response.data?.map((item: any) => ({
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
  opencreate() {
    this.personalDetails = {}
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
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
    if (!isDigit || (value && value.length >= 12)) {
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

  async onBranchChange(branchId: any) {
    console.log('Selected Branch ID:', branchId);
    this.personalDetails['branchId'] = branchId
    this.personalDetails['departmentId'] = null
    this.personalDetails['designationId'] = null
    this.personalDetails['reportingPersonId'] = null
    this.personalDetails['empType'] = null
    await this.DepartmentDD()
    // await this.designationDD()
    await this.getEmploymentTypes()
  }
  async update(data: any) {

    this.personalDetails = Object.assign({}, data);
    const dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1).toString().padStart(2, '0')}-${dob.getDate().toString().padStart(2, '0')}`;;
    this.personalDetails.dateOfBirth = formattedDob;
    this.personalDetails.state = Number(this.personalDetails.state);
    this.personalDetails.city = Number(this.personalDetails.city);
    this.personalDetails.country = Number(this.personalDetails.country);
    await this.getstates(this.personalDetails.country);
    await this.getcity(this.personalDetails.state);
    await this.getDesignation(this.personalDetails.departmentId);
    this.employeeList = this.employeeList.filter((item: any) => item.value != this.personalDetails.id);
    this.createFlag = true;
    this.updateFlag = true;
  }
  updateform() {
    this.createFlag = false;
    this.listflag = true;
    this.updateFlag = false;

    const dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;;
    const obj = Object.assign({}, this.personalDetails);
    obj.dateOfBirth = formattedDob;
    obj.emp_status='approved'
    obj.type = 'pending_employee'

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
        // console.error('Error adding employee:', error);
        // this.notyf.error('Failed to add employee. Please try again.');
      }

    )

  }


  reset() {
    this.personalDetails = {};
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
    this.pageSize = size;
    this.currentPage = 1;
    this.applyFilters();
  }


}
