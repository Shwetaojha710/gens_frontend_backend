import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { PayrollService } from '../../services/payroll.service';
import { StatusService } from '../../services/status.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
declare let bootstrap: any;
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-full-time-salary',
  // standalone: true,
  imports: [
    NgSelectModule,
    FormsModule,
    CommonModule,
    SearchPaginationComponent
  ],
  templateUrl: './full-time-salary.component.html',
  styleUrls: ['./full-time-salary.component.css']
})


export class FullTimeSalaryComponent {
  monthObj: any = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May', '06': 'June',
    '07': 'July', '08': 'August', '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  }
  monthList = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  yearList: any = [];
  notyf: Notyf;
  obj: any = {}
  constructor(public attendanceService: AttendanceService, private master: MasterService, private router: Router, private payroll: PayrollService, private statusService: StatusService) {
    this.notyf = new Notyf();
  }
  async ngOnInit() {
    await this.empList()
    await this.getYear();
  }
  pageSize = 10;
  currentPage = 1;
  searchTerm: any;;
  itemsPerPage = 10;
  onSearch(term: string) {
    if (!term) {
      // this.SalaryArr
      this.onSubmit();
    } else {
      this.searchTerm = term.toLowerCase();
      this.currentPage = 1;
      this.applyFilters();
    }

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
  filteredSalary: any = []
  searchText: any = ''
  applyFilters() {



    const value = this.searchTerm || '';
    this.searchText = value.trim();

    if (this.searchText === '') {
      this.SalaryArr = [...this.originalList];
    } else {
      this.SalaryArr = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }

    let data = [...this.SalaryArr];
    // pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredSalary = data.slice(start, end);
  }
  checkUncheckAll() {
    this.SalaryArr.forEach((item: any) => item.isSelected = this.masterSelected);
  }
  masterSelected: boolean = false;

  isAllSelected() {
    this.masterSelected = this.SalaryArr.every((item: any) => item.isSelected);

  }
  async getYear() {
    this.yearList = []
    this.master.getAttendanceYear().subscribe((data: { [x: string]: any; data: any; }) => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.yearList = data.data;
        console.log(this.EmpList, "attendance master list");

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        // this.notyf.error(data['message']);
      }
    });

  }
  deleteAttendance(id: number) {
    this.attendanceService.deleteAttendance(id).subscribe((data: { [x: string]: any; data: any; }) => {
      if (data['status'] == true) {
        this.notyf.success(data['message']);
        this.attendanceList = this.attendanceList.filter((item: any) => item.id !== id);
        // this.originalList = this.attendanceList; // Update original list for filtering
        this.loadAttendance();
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      } else {
        this.notyf.error(data['message']);
      }
    })
  }
  delete(data: any) {
    this.SalaryArr = this.SalaryArr.filter((item: any) => item.employeeId != data.employeeId)
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
          this.RejectLeave(item, status)

        } else if (

          result.dismiss === Swal.DismissReason.cancel
        ) {

        }
      });

    }
    else {
      let newObj: any = {}
      newObj = Object.assign({}, item)
      // newObj['id']=item.id
      newObj['status'] = status
      // newObj['employeeId']=item.employeeId

      this.master.UpdateApplyLeaveStatus(newObj).subscribe({
        next: (response: any) => {
          console.log('response', response);

          let message = response.message ? response.message : 'Data found Successfully';
          let status = this.statusService.handleResponseStatus(response.status, message);
          console.log(status)
          console.log("response", response);

          if (status === true) {

            this.notyf.success(message)
            this.loadLeaveRequests();
            // this.resetForm();
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

  RejectLeave(item: any, status: any) {
    let newObj: any = {}
    newObj = Object.assign({}, item)
    // newObj['id']=item.id
    newObj['status'] = status
    // newObj['employeeId']=item.employeeId

    this.master.UpdateApplyLeaveStatus(newObj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.loadLeaveRequests();
          // this.resetForm();
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
  employeeSalaryData: any[] = [];

  async generate_Salary() {


    this.employeeSalaryData = [];

    const selectedEmployees = this.SalaryArr.filter((item: any) => item.isSelected);
    if (selectedEmployees.length == 0) {
      this.notyf.error('Please Select CheckBox');
      return;
    }
    this.employeeSalaryData = await Promise.all(
      selectedEmployees.map(async (item: any) => {
        const components = await this.getSalaryComponent(item);
        return { ...item, components };
      })
    );
    this.isLoading = true
    try {
      const response: any = await firstValueFrom(
        this.payroll.generateSalary(this.employeeSalaryData)
      );
      this.isLoading = false
      if (this.statusService.handleResponseStatus(response.status, response.message || "Success")) {
        this.masterSelected = false
        Swal.fire({
          title: "Salary Generated Successfully",
          imageUrl: "/assets/img/icons8-success-192.gif",
          imageWidth: 140,
          imageHeight: 140,
          imageAlt: "Success Icon",
          confirmButtonText: '<i class="fa fa-download"></i> Download Excel File',
          confirmButtonColor: "#0663a9",
          showCancelButton: true,
          text: "Please click the button below to download the Excel file containing the salary details.",
          cancelButtonText: '<i class="fa fa-times me-2"></i> Cancel',
          cancelButtonColor: "#d33",
          reverseButtons: true
        }).then(async (result) => {
          if (result.isConfirmed) {
            await this.generateExcel();
          }
        });



        // this.notyf.success(response.message);


      } else {

        this.isLoading = false
        this.notyf.error(response.message);
      }
    } catch (error: any) {
      this.isLoading = false
      console.error("API Error:", error);

      if (error.error?.message) {
        this.notyf.error(error.error.message);
      } else {
        this.notyf.error("Something went wrong!");
      }
    }
    return;
  }

  generateExcel() {
    this.isLoading = true;
    this.SalaryArr = []
    this.originalList = []
    // let newObj = Object.assign({}, this.obj)
    // if (newObj['employeeId'] === 'All') {
    //   newObj['employeeId'] = this.EmpList
    //     .map((item: any) => item.value)
    //     .filter((val: any) => val != 'All');
    // } else {
    //   newObj['employeeId'] = [newObj['employeeId']]
    // }

    this.payroll.getGeneratedSalaryList(this.newObj).subscribe({
      next: async (response: any) => {
        console.log('response', response);
        this.isLoading = false;
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        // console.log(status)
        // console.log("response", response);     // console.log(status)
        // console.log("response", response);

        if (status == true) {

          this.notyf.success(message)
         response.data.salaryList = response.data.salaryList.map((item: any, index: any) => {
            return {
              ...item,
              si_no: index + 1,
            }
          })
          this.SalaryArr = response.data.salaryList

          this.originalList = response.data.salaryList
          // console.log(this.SalaryArr, "salary Array");
          // pagination
          const start = (this.currentPage - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.filteredSalary = this.SalaryArr.slice(start, end);
          await this.export();
        }
        else if (status == "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error:', err);
        this.notyf.error(err.error?.message)
      }
    });
  }
  newVar: any = false
  changeTab(tab: string) {

    this.activeTab = tab;
    this.newVar = false

    switch (tab) {
      case 'salary':
        this.filterData();
        // this.newVar=true
        break;

      case 'absentDays':
        // this.filterData()
        this.newVar = true
        this.filterData();
        // this.absentDaysArr = this.newObjAssign?.absentdaysArr || [];
        break;

      case 'attendance':
        this.loadAttendance();
        break;

      case 'leave':
        this.loadLeaveRequests();
        break;

    }

  }
  //   changeTab(tab: string) {

  //     this.activeTab = tab;

  //     if (tab == 'salary') {
  //       this.onSubmit()
  //       // Call salary component API
  //       if (this.newObjAssign) {
  //         this.view(this.newObjAssign);
  //       }

  //     } else if (tab == 'absentDays') {
  // //  if (this.newObjAssign) {
  // //         this.view(this.newObjAssign);
  // //       }
  //       // Just show data already loaded
  //       this.absentDaysArr = this.newObjAssign?.absentdaysArr || [];

  //     } else if (tab == 'attendance') {

  //       this.loadAttendance();

  //     } else if (tab == 'leave') {

  //       this.loadLeaveRequests();

  //     }

  //   }
  async export() {
    const exportData: any[] = [];

    this.SalaryArr.forEach((employee: any) => {
      const row: any = {};
      row['Employee'] = employee.employeeName;
      row['empCode'] = employee?.empCode;
      // row['email'] = employee?.email;
      // row['phone'] = employee?.phone;
      // row['department'] = employee?.department;
      // row['designation'] = employee?.designation;
      row['Account Number'] = employee?.bankAccount;
      row['IFSC Code'] = employee?.ifscCode;
      row['Net Amount'] = Math.round(employee?.net_amount).toFixed(0);

      exportData.push(row);
    });


    const worksheet: XLSX.WorkSheet = {};


    // const monthYear = `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;
    const monthYear = `${this.monthObj[this.obj['month']]}-${this.obj['year']}`;
    XLSX.utils.sheet_add_aoa(worksheet, [[`Salary Sheet - ${monthYear}`]], { origin: "A1" });


    XLSX.utils.sheet_add_json(worksheet, exportData, { origin: "A2", skipHeader: false });


    const totalCols = Object.keys(exportData[0]).length;
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }
    ];


    worksheet['A1'].s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    const workbook: XLSX.WorkBook = {
      Sheets: { 'Salary': worksheet },
      SheetNames: ['Salary']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(blob, `Salary_${monthYear}.xlsx`);
    this.SalaryArr = []
    this.originalList = []
    this.filteredSalary = []
    this.obj = {}
  }
  EmpList: any = []
  async empList() {
    this.EmpList = []
    this.master.getemployeeList().subscribe((data: { [x: string]: any; data: any; }) => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.EmpList = data.data;
        console.log(this.EmpList, "attendance master list");

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        // this.notyf.error(data['message']);
      }
    });

  }

  back() {

  }
  SalaryArr: any = []
  isLoading: boolean = false;
  originalList: any = []
  newObj: any = {}
  absentDaysArr: any = []
  onSubmit() {
    if (this.obj['year'] == undefined || this.obj['year'] == null || this.obj['year'] == '') {
      this.notyf.error("year is Required");
      return
    }
    this.newObj = {}
    this.isLoading = true;
    this.SalaryArr = []
    this.originalList = []
    this.absentDaysArr = []
    this.filteredSalary = []
    this.newObj = Object.assign({}, this.obj)
    if (this.newObj['employeeId'] == 'All') {
      this.newObj['employeeId'] = this.EmpList
        .map((item: any) => item.value)
        .filter((val: any) => val != 'All');
    } else {
      this.newObj['employeeId'] = [this.newObj['employeeId']]
    }

    this.payroll.calculateAttendance(this.newObj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        this.isLoading = false;
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);

        console.log("response", response);

        if (status == true) {

          this.notyf.success(message)
          this.SalaryArr = response.data
          this.originalList = response.data

          // pagination
          const start = (this.currentPage - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.filteredSalary = this.SalaryArr.slice(start, end);
        }
        else if (status == "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error:', err);
        this.notyf.error(err.error?.message)
      }
    });



  }
  SalaryBreakup: any = []
  modal: any;
  PayArr: any = []
  DedArr: any = []
  personalDetails: any = {}
  EmployerDedArr: any = []
  newObjAssign: any = {}
  view(item: any) {
    if(!this.modal){
   const modalEl = document.getElementById('SalaryModal');
   this.modal = new bootstrap.Modal(modalEl);
}
this.modal.show();
    this.activeTab = 'salary'
    if (this.newVar == true) {
      this.activeTab = 'absentDays'
    }



    // this.activeTab = 'salary';
    const obj = Object.assign({}, item)
    // this.newObjAssign = Object.assign({}, item)
    // this.absentDaysArr = obj.absentdaysArr
    // this.personalDetails = {}

    this.newObjAssign = { ...item };

    this.absentDaysArr = this.newObjAssign.absentdaysArr || [];

    this.personalDetails = { ...item };
    // this.personalDetails = obj
    this.SalaryBreakup = []
    this.EmployerDedArr = []
    const modalEl = document.getElementById('SalaryModal');
    this.payroll.calculateSalaryComponent(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {
          this.notyf.success(message);
          this.SalaryBreakup = response.data;

          // Initialize arrays to store filtered data
          const PayArr = [];
          const DedArr = [];
          const EmployerDedArr = [];

          // Initialize totals
          let totalEarning = 0;
          let totalDeduction = 0;
          let totalEmployerDeduction = 0;

          // Process data in a single loop
          for (const item of this.SalaryBreakup) {
            const amount = Number(item.pay_amount || 0);

            if (item.pay_code === 'PAY') {
              PayArr.push(item);
              totalEarning += amount;
            } else if (item.pay_code === 'DED') {
              if (item.name.toLowerCase().includes('employer')) {
                EmployerDedArr.push(item);
                totalEmployerDeduction += amount;
              } else {
                DedArr.push(item);
                totalDeduction += amount;
              }
            }
          }

          // Update component properties with filtered data and totals
          this.PayArr = [...PayArr, { isSummary: true, name: 'Total Earnings', pay_amount: (totalEarning).toFixed(2) }];
          this.DedArr = [...DedArr, { isSummary: true, name: 'Total Deductions', pay_amount: (totalDeduction).toFixed(2) }];
          this.EmployerDedArr = [...EmployerDedArr, { isSummary: true, name: 'Total Employer Deductions', pay_amount: (totalEmployerDeduction).toFixed(2) }];

          // Calculate net pay
          const netPay = totalEarning - totalDeduction;

          // Show the modal
          // const modalEl = document.getElementById('SalaryModal');
          // this.modal = new bootstrap.Modal(modalEl);
          // this.modal.show();
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
  async getSalaryComponent(item: any) {
    const obj = { ...item };
    const response: any = await this.payroll.calculateSalaryComponent(obj).toPromise();

    if (response && response.status == true) {

      return response.data;
    } else {
      // throw new Error(response.message);
    }
  }

  closeModal() {

    this.modal.hide();
  }
  activeTab = 'salary';

  attendanceList: any[] = [];
  leaveList: any[] = [];
  loadAttendance() {

    const empId = this.personalDetails?.employeeId;
    let newObj: any = {}
    newObj = {
      "employeeId": empId,
      "month": this.obj['month'],
      "year": this.obj['year'],
      "shift_name": this.personalDetails?.shift_name
    }
    this.payroll.empMonthlyLeaveAttDetails(newObj).subscribe({
      next: (response: any) => {

        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);

        if (status === true) {

          this.attendanceList = response.data?.attendanceList || [];

        }
        else if (status == "expired") {
          this.router.navigate(["login"]);
        }
        else {
          this.notyf.error(message);
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err.error?.message);
      }
    });

  }

  loadLeaveRequests() {

    const empId = this.personalDetails?.employeeId;
    let newObj: any = {}
    newObj = {
      "employeeId": empId,
      "month": this.obj['month'],
      "year": this.obj['year'],
      "shift_name": this.personalDetails?.shift_name
    }
    this.payroll.empMonthlyLeaveAttDetails(newObj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {
          this.leaveList = response.data?.leaveList || [];

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

    // this.apiService.getEmployeeLeaves({
    //   emp_id: empId
    // }).subscribe((res:any)=>{

    //   this.leaveList = res.data || [];

    // });

  }
  newObj1: any = {}
  filterData() {
    if (this.obj['year'] == undefined || this.obj['year'] == null || this.obj['year'] == '') {
      this.notyf.error("year is Required");
      return
    }
    this.newObj1 = {}
    this.isLoading = true;
    // this.SalaryArr = []
    // this.originalList = []
    // this.absentDaysArr = []
    this.newObj1 = Object.assign({}, this.obj)
    // if (this.newObj['employeeId'] === 'All') {
    //   this.newObj['employeeId'] = this.EmpList
    //     .map((item: any) => item.value)
    //     .filter((val: any) => val != 'All');
    // } else {
    this.newObj1['employeeId'] = [this.personalDetails['employeeId']]
    // }

    this.payroll.calculateAttendance(this.newObj1).subscribe({
      next: (response: any) => {
        console.log('response', response);
        this.isLoading = false;
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);

        console.log("response", response);

        if (status == true) {

          this.notyf.success(message)

          this.view(response.data[0])

        }
        else if (status == "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error:', err);
        this.notyf.error(err.error?.message)
      }
    });



  }

  // newObj: any = {}
  updateFlag: boolean = false;
  applyUpdate(item: any) {
    //     Swal.fire({
    //       title: "Are you sure?",
    //       text: "Do you Want to Enable this",
    //       icon: "warning",
    //       showCancelButton: true,
    //       confirmButtonText: "Yes, Enable it!",
    //       cancelButtonText: "No, cancel!",
    //       reverseButtons: true
    //     }).then((result) => {
    //       if (result.isConfirmed) {
    //          item.editable = true // toggle enable/disable

    //       } else if (result.dismiss === Swal.DismissReason.cancel) {
    //  item.editable = false
    //       }
    //     });
    item.editable = true
  }
  editingId: any
  update(data: any) {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you Want to Update this",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Update it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {

        this.newObj = data;
        this.editingId = data.id;
        this.newObj.checkIn = `${data?.date} ${data?.checkIn}`
        this.newObj.checkOut = `${data?.date} ${data?.checkOut}`
        this.newObj.startDate = new Date(data.startDate);
        this.newObj.endDate = new Date(data.endDate);
        // this.generateDayList(this.newObj.startDate, this.newObj.endDate);
        this.UpdateAttendance()
        // Swal.fire({
        //   title: "Deleted!",
        //   text: "Your file has been deleted.",
        //   icon: "success"
        // });
      } else if (result.dismiss === Swal.DismissReason.cancel) {

      }
    });

  }

  openupdate() {
    this.updateFlag = true;

  }

  UpdateAttendance() {
    this.attendanceService.updateAttendance(this.newObj).subscribe((data: {
      [x: string]: any;
    }) => {
      if (data['status'] == true) {
        this.notyf.success(data['message']);
        this.loadAttendance();
        this.updateFlag = false;
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    },
      (error: any) => {
        this.notyf.error('Failed to update attendance. Please try again.');
      }
    );

  }

  correctAll() {
    const selectedEmployees = this.attendanceList.filter((item: any) => item.editable);
    if (selectedEmployees.length == 0) {
      this.notyf.error('Please Select CheckBox');
      return;
    }
    this.attendanceService.BulkUpdateAttendance(this.attendanceList).subscribe((data: {
      [x: string]: any;
    }) => {
      if (data['status'] == true) {
        this.notyf.success(data['message']);
        this.loadAttendance();
        this.updateFlag = false;
      } else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    },
      (error: any) => {
        this.notyf.error('Failed to update attendance. Please try again.');
      }
    );

  }

}
