import { Component } from '@angular/core';
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
  itemsPerPage = 10;
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
    this.pageSize = size;
    this.currentPage = 1;
    this.applyFilters();
  }
  filteredDesignation: any = []
  searchText: any = ''
  originalList: any = []
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

   async onBranchChange(branchId: any) {
    console.log('Selected Branch ID:', branchId);
    this.personalDetails['branchId']=branchId
    this.personalDetails['departmentId']=null
    this.personalDetails['designationId']=null
    this.personalDetails['reportingPersonId']=null
    this.personalDetails['empType']=null
    await this.DepartmentDD()
    // await this.designationDD()
    await this.getEmploymentTypes()
  }

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

     if (
      !this.validateField(this.personalDetails.firstName, 'First Name') ||
      !this.validateField(this.personalDetails.lastName, 'Last Name') ||
      !this.validateField(this.personalDetails.email, 'Email') ||
      !this.validateField(this.personalDetails.mobile, 'Mobile Number') ||
      // !this.validateField(this.personalDetails.adhaarNo, 'Aadhaar Number') ||
      !this.validateField(this.personalDetails.dateOfBirth, 'Date of Birth')
      // !this.validateField(this.personalDetails.currentAddress, 'Current Address') ||
      // !this.validateField(this.personalDetails.permanentAddress, 'Permanent Address') ||
      // !this.validateField(this.personalDetails.city, 'City') ||
      // !this.validateField(this.personalDetails.gender, 'Gender') ||
      // !this.validateField(this.personalDetails.martialStatus, 'Marital Status') ||
      // !this.validateField(this.personalDetails.shift_id, 'Shift')
    ) {
      return;
    }

    if (this.personalDetails.mobile.length !== 10) {
      this.notyf.error('Please enter a valid 10 digit mobile number');
      return;
    }
    let aadhaarRaw
    if(this.personalDetails.adhaarNo){
       aadhaarRaw = this.personalDetails.adhaarNo.replace(/\D/g, '');
    }
    // if (aadhaarRaw.length !== 12) {
    //   this.notyf.error('Please enter a valid 12 digit Aadhaar number');
    //   return;
    // }
    const dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;;
    let obj: any = {}
    obj = Object.assign({}, this.personalDetails);
    obj.dateOfBirth = formattedDob;
    obj.adhaarNo = aadhaarRaw
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
  cardData: any = {}
  async loadEmployees() {
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
    this.personalDetails.country = Number(this.personalDetails.country);
    await this.getStateDistrict(this.personalDetails.pinCode);
    // await this.getstates(this.personalDetails.country);
    // await this.getcity(this.personalDetails.state);
    await this.getDesignation(this.personalDetails.departmentId);
    this.employeeList = this.employeeList.filter((item: any) => item.value != this.personalDetails.id);


    this.createFlag = true;
    this.updateFlag = true;
  }

  inActiveFlag: any = false
  activeFlag: any = false
  newJoinerFlag: any = false
  totalEmpFlag: any = true

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
    this.createFlag = false;
    this.listflag = true;
    this.updateFlag = false;

    const dob = new Date(this.personalDetails.dateOfBirth);
    const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;;
    const obj = Object.assign({}, this.personalDetails);
    obj.dateOfBirth = formattedDob;
    const aadhaarRaw = obj.adhaarNo.replace(/\D/g, '');
    // if (aadhaarRaw.length !== 12) {
    //   this.notyf.error('Please enter a valid 12 digit Aadhaar number');
    //   return;
    // }
    obj.adhaarNo=aadhaarRaw
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
  }
  back() {
    this.personalDetails = {}
    this.createFlag = false
    this.employeeList = this.employees?.map((item: any) => ({
      value: item.id,
      label: `${item.firstName} ${item?.lastName || ''}`
    }));
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
