import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { DataService } from '../../services/data.service';
import { PayrollService } from '../../services/payroll.service';
import { StatusService } from '../../services/status.service';

@Component({
  selector: 'app-part-time-salary',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './part-time-salary.component.html',
  styleUrl: './part-time-salary.component.css'
})
// export class PartTimeSalaryComponent {

// }

export class PartTimeSalaryComponent {
  Number(arg0: any): any {
    throw new Error('Method not implemented.');
  }
  obj: any = {}
  notyf: Notyf;
  ComponentList: any = []
  personalDetails: any = []
  constructor(public payrollService: PayrollService, private router: Router, public statusService: StatusService, public dataService: DataService) {
    this.notyf = new Notyf();

    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
  }
  type: any = [{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }]
  departmentDD: any = []
  async ngOnInit() {
   await this.getSalarySetUpList()

  }


  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  convertNumberToWords(amount: number): string {
  if (amount === 0) return 'Zero';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const numToWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };
  return numToWords(Math.floor(amount));
}

  // getSalarySetUpList() {
  //  this.obj['employeeId']=this.personalDetails['id']

  //   this.payrollService.getSalarySetupList(this.obj).subscribe({
  //     next: (response: any) => {

  //       let message = response.message ? response.message : 'Data found Successfully';
  //       let status = this.statusService.handleResponseStatus(response.status, message);

  //       if (status === true) {
  //         this.notyf.success(message)
  //         this.ComponentList=[]
  //         this.totalPayable =0
  //         this.totalDeductible =0
  //         this.obj={}
  //         this.back()
  //       }
  //       else if (status === "expired") {
  //         this.router.navigate(["login"]);
  //       }

  //       else {
  //         this.notyf.error(message)
  //       }

  //     },
  //     error: (err) => {
  //       console.error('Error:', err);
  //        this.notyf.error(err?.error?.message)
  //     }
  //   });




  // }
  totalPayable: any = 0;
  totalDeductible: any = 0;
  getSalarySetUpList() {
    console.log(this.obj)
    this.totalPayable = 0
    this.totalDeductible = 0
    this.ComponentList = []
    this.obj['employeeId'] = this.personalDetails.id
    this.payrollService.getSalarySetupList(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        ;

        if (status === true) {
          this.ComponentList = []

          // this.ComponentList = response.data.map((item: any) => ({
          //   ...item,
          //   calculated_amount: Math.round(item?.calculated_amount).toFixed(0) || 0,
          //   isSelected: item?.status === 'active'
          // }));

           this.ComponentList = [
  ...response.data.allowances.map((item:any) => ({ ...item, component_type: "payable" })),
  ...response.data.basics.map((item:any) => ({ ...item, component_type: "payable" })),
  ...response.data.deductions.map((item:any) => ({ ...item, component_type: "deductible" }))
];

console.log( this.ComponentList);

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
           this.notyf.error(err?.error?.message)
      }
    });




  }
  isCTCReached: boolean = false;
addamount() {
  let totalEarning = 0;
  let totalDeduction = 0;
  totalEarning=this.totalPayable
  totalDeduction=this.totalDeductible
  this.totalPayable = this.ComponentList
    .filter((item: any) => item.component_type === 'payable')
    .reduce((sum: number, item: any) => sum + (Number(item.calculated_amount) || 0), 0);

  this.totalDeductible = this.ComponentList
    .filter((item: any) => item.component_type === 'deductible')
    .reduce((sum: number, item: any) => sum + (Number(item.calculated_amount) || 0), 0);

  if (this.totalPayable < 0) this.totalPayable = 0;
  if (this.totalDeductible < 0) this.totalDeductible = 0;

  const netAmount = this.totalPayable - this.totalDeductible;

  if (netAmount > this.obj['CTC']) {
    // this.totalPayable = totalEarning;
    // this.totalDeductible = totalDeduction;
     this.isCTCReached = true
    this.notyf.error("Net CTC cannot exceed Total CTC");
    return; // stop execution here
    return; // stop execution here
  }


  console.log("Net Amount:", netAmount);
}

  masterSelected: boolean = false;
  checkUncheckAll() {
    this.ComponentList.forEach((item: any) => item.isSelected = this.masterSelected);
  }


  isAllSelected() {
    this.masterSelected = this.ComponentList.every((item: any) => item.isSelected);
    this.ComponentList=this.ComponentList.map((item: any) => ({
      ...item,
      status:item.isSelected==false? item.status='inactive':item.status='active'
    }) );


  }

  getStatusClass(status: any): string {
    switch (status) {
      case 'inactive': return 'bg-label-danger';
      case 'active': return 'bg-label-success';
      default: return 'bg-label-secondary';
    }
  }
  createFlag: any = false
  listflag: any = true
  updateFlag: any = false
  editingId: any
  opencreate() {
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
  }

  update(dept: any) {
    this.obj = Object.assign({}, dept)
    this.editingId = this.obj.id;
    this.createFlag = true
    this.updateFlag = true
  }
  updatedata() {
    this.obj['id'] = this.editingId
    this.obj['employeeId'] = this.personalDetails.id
    this.payrollService.updateBasic(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)

          this.resetForm();
        }
        else if (status === "expired") {
          this.router.navigate(["login"]);
        }
        else {
          this.notyf.error(message)
        }
      },
      error: (err: any) => {
        console.error('Error:', err);
        this.notyf.error(err.error.message)
      }



    })

  }
  resetForm() {
    this.createFlag = false
    this.obj = {}
    this.editingId = null;
  }
  delete(id: any) {


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
        this.deleteBasic(id)
        // Swal.fire({
        //   title: "Deleted!",
        //   text: "Your file has been deleted.",
        //   icon: "success"
        // });
      } else if (
        /* Read more about handling dismissals below */
        result.dismiss === Swal.DismissReason.cancel
      ) {
        // Swal.fire({
        //   title: "Cancelled",
        //   text: "Your imaginary file is safe :)",
        //   icon: "error"
        // });
      }
    });


  }
  deleteBasic(id: any) {
    let obj: any = {}
    obj['id'] = id

    this.payrollService.deleteBasic(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)

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
        this.notyf.error(err?.message)
      }

    })
  }
  calculateamt() {
    this.obj['finalAmount'] = (this.obj['amount'] * this.obj['typeValue']) / 100

  }
}
