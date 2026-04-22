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
import * as bootstrap from 'bootstrap';
@Component({
  selector: 'app-salary-setup',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './salary-setup.component.html',
  styleUrl: './salary-setup.component.css'
})


export class SalarySetupComponent {
  Number(arg0: any): any {
    throw new Error('Method not implemented.');
  }

  obj: any = {}
  notyf: Notyf;
  ComponentList: any = []
  ComponentDD: any = []
  personalDetails: any = []
  currency: any;
  minDate: any
  constructor(public payrollService: PayrollService, private router: Router, public statusService: StatusService, public dataService: DataService) {
    this.notyf = new Notyf();
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.currency = JSON.parse(localStorage.getItem('currency') || '{}');
  }
  type: any = [{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }]
  endDateDD: any = [{ value: 'all_period', label: 'ALL Period' }, { value: 'custom', label: 'Custom' }]
  salaryBreakDown: any = [{ value: 'year', label: 'Yearly' }, { value: 'monthly', label: 'Monthly' }]
  departmentDD: any = []
  async ngOnInit() {
    this.obj['status'] = 'active'
    this.getSalarySetUpList()
    this.ComponentDropdown()
  }

  getToDateMin(): string {
    return this.newObj['startDate'] || this.minDate;
  }

  createVariablePay() {


    if (this.newObj.componentId == undefined || this.newObj.componentId == '') {
      this.notyf.error("Select Component")
      return
    }
    if (this.newObj.finalAmount == undefined || this.newObj.amount == '') {
      this.notyf.error("Enter amount")
      return
    }
    if (this.newObj['startDate'] == undefined || this.newObj['startDate'] == null) {
      this.notyf.error("Select start Date ")
      return
    }
    let comp = this.ComponentDD.find((item: any) => item.componentId == this.newObj['componentId']);

    if (comp) {
      this.newObj = {
        ...this.newObj,  // keep existing keys (amount, startDate, etc.)
        ...comp          // add new keys (label, value_type, etc.)
      };
    }
    this.newObj['employeeId'] = this.personalDetails?.id
    this.payrollService.createVariable(this.newObj).subscribe({
      next: (response: any) => {

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);

        if (status === true) {
          this.notyf.success(message)
          this.ComponentList = []
          this.totalPayable = 0
          this.totalDeductible = 0
          this.newObj = {}

          this.back()
          this.getSalarySetUpList()
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
        let errorMessage = err?.error?.message ? err?.error?.message : err?.message
        this.notyf.error(errorMessage)
      }
    });

  }
  ComponentDropdown() {
    this.ComponentDD = []
    this.payrollService.getComponentDd(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        ;

        if (status === true) {
          this.ComponentDD = response.data

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
  modal: any;
  view(item: any) {
    this.SalArr = this.SalArr
    const modalEl = document.getElementById('SalaryModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }

  }
  SalArr: any = []
  basic: any = []
  DedArr: any = []
  PayArr: any = []
  deductionArr: any = []
  EarningArr: any = []
  ctc:any=0
  getSalarySetUpList() {
    this.SalArr = []
    this.totalPayable = 0
    this.totalDeductible = 0
    this.ComponentList = []
    this.basic = []
    this.deductionArr = []
    this.EarningArr = []
    this.obj['employeeId'] = this.personalDetails.id
    this.payrollService.getSalarySetupList(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        ;

        if (status === true) {
          this.SalArr = []
          this.basic = []
          // this.ComponentList = response.data.map((item: any) => ({
          //   ...item,
          //   calculated_amount: Math.round(item?.calculated_amount).toFixed(0) || 0,
          //   isSelected: item?.status === 'active'
          // }));
          this.ctc = response.data.basics[0]?.finalCTC || 0

          this.SalArr = [
            ...response.data.basics.map((item: any) => ({ ...item, component_type: "Earning", status: item.status || 'inactive' })),
            ...response.data.allowances.map((item: any) => ({ ...item, component_type: "Earning", status: item.status || 'inactive' })),
            ...response.data.deductions.map((item: any) => ({
              ...item,
              component_name: item?.name,
              component_type: "deductible",
              status: item.status || 'inactive'
            }))
          ];
          if(this.obj['salaryBreakDown'] == 'monthly'){

            this.SalArr = this.SalArr.map((item: any) => ({
              ...item,
              finalAmount:(Number(item?.finalAmount) / 12).toFixed(2) || 0,
              isSelected: item?.status == 'active'
            }));
             this.ctc=  (this.ctc/12).toFixed(2)
          }

          this.updateMasterSelected();
        }
        else if (status === "expired") {
          localStorage.clear()

          this.router.navigate(["login"]);
        }

        else {
          // this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err?.error?.message)
      }
    });




  }
  back() {
    this.obj = {}
    this.obj['status'] = 'active'
    this.createFlag = false
    this.variableFlag = false
  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]


  // convertNumberToWords(amount: number): string {
  //   if (amount === 0) return 'zero';
  //   const a = [
  //     '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  //     'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
  //   ];
  //   const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  //   const numToWords = (n: number): string => {
  //     if (n < 20) return a[n];
  //     if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
  //     if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numToWords(n % 100) : '');
  //     if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
  //     if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
  //     return numToWords(Math.floor(n / 10000000)) + ' crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  //   };
  //   return numToWords(Math.floor(amount));
  // }




  onSubmit() {
    console.log(this.obj)
    this.ComponentList = this.ComponentList.map((item: any) => ({
      ...item,
      status: item.isSelected == false ? item.status = 'active' : item.status = 'active',
      calculated_amount: item.calculated_amount === undefined ? 0 : Number(item.calculated_amount)
    }));
    console.log(this.ComponentList)

    if (this.obj.CTC == undefined || this.obj.CTC == 0) {
      this.notyf.error("Please Enter CTC")
      return
    }
    if (this.ComponentList.length == 0) {
      this.notyf.error("Please Calculate Salary")
      return
    }
    if (this.obj['startDate'] == undefined || this.obj['startDate'] == null) {
      this.notyf.error("Please Select Effective Date ")
      return
    }
    this.obj['employeeId'] = this.personalDetails.id
    this.obj['data'] = this.ComponentList
    this.obj['FinalCTC'] = this.FinalRecord?.netCTC
    this.obj['empType'] = this.personalDetails?.empType
    this.obj['CTC'] = this.FinalRecord?.netPayableSalary
    this.payrollService.AddSalarycomp(this.obj).subscribe({
      next: (response: any) => {

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);

        if (status === true) {
          this.notyf.success(message)
          this.ComponentList = []
          this.totalPayable = 0
          this.totalDeductible = 0
          this.obj = {}

          this.back()
          this.obj['status'] = 'active'
          this.getSalarySetUpList()

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
  totalPayable: any = 0;
  totalDeductible: any = 0;
  FinalRecord: any = {}
  mergedArray: any = [];
  calculateSalary() {
    console.log(this.obj)
    this.totalPayable = 0
    this.FinalRecord = {}
    this.totalDeductible = 0
    this.ComponentList = []
    this.obj['employeeId'] = this.personalDetails.id
    this.payrollService.SetUpsalary(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);

        if (status === true) {
          this.ComponentList = []
          this.PayArr = []
          this.DedArr = []
          this.ComponentList = response.data.records.map((item: any) => ({
            ...item,
            calculated_amount: item?.calculated_amount || 0,
            isSelected: item?.status == 'active'

          }));
          this.FinalRecord = response.data.FinalRecord
          this.PayArr = this.ComponentList.filter((item: any) => item.component_type === 'payable');
          this.PayArr = this.PayArr.sort((a: any, b: any) => a.component_name.localeCompare(b.component_name))
          this.mergedArray = []
          this.DedArr = this.ComponentList.filter((item: any) => item.component_type === 'deductible');
          this.DedArr = this.DedArr.sort((a: any, b: any) => a.component_name.localeCompare(b.component_name))
          this.EarningMasterSelected = this.PayArr.every((item: any) => item.isSelected === true);
          this.DeductionMasterSelected = this.DedArr.every((item: any) => item.isSelected === true);

        }
        else if (status === "expired") {
          localStorage.clear()
          this.router.navigate(["login"]);
        }

        else {
          this.ComponentList = []
          this.PayArr = []
          this.DedArr = []
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
    totalEarning = this.totalPayable
    totalDeduction = this.totalDeductible
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

    }


    console.log("Net Amount:", netAmount);
  }

  EarningMasterSelected: boolean = false;
  masterSelected: any = false;
  DeductionMasterSelected: boolean = false;
  EarningCheckUncheckAll() {
    this.PayArr.forEach((item: any) => {
      item.isSelected = this.EarningMasterSelected;


      if (item.original_amount === undefined) {
        item.original_amount = item.calculated_amount;
      }


      item.calculated_amount = item.isSelected ? item.original_amount : 0;
      item.status = item.isSelected ? 'active' : 'inactive';
    });


    this.ComponentList.forEach((item: any) => {
      if (this.PayArr.some((d: any) => d.componentId == item.componentId)) {
        item.isSelected = this.EarningMasterSelected;
        item.status = this.EarningMasterSelected ? 'active' : 'inactive';
      }
    });

    // 🔹 Recalculate totals
    this.recalculateFinalRecord();

  }

  onStatusChange(event: Event, item: any): void {
    const checked = (event.target as HTMLInputElement).checked;
    item.status = checked ? 'active' : 'inactive';
    this.updateMasterSelected();
  }

  checkUncheckAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.masterSelected = checked;
    this.SalArr.forEach((item: any) => {
      item.status = checked ? 'active' : 'inactive';
    });
  }

  updateMasterSelected(): void {
    const allActive = this.SalArr.every((item: any) => item.status === 'active');
    const allInactive = this.SalArr.every((item: any) => item.status === 'inactive');

    if (allActive) {
      this.masterSelected = true;
    } else if (allInactive) {
      this.masterSelected = false;
    } else {
      this.masterSelected = null;
    }
  }

  recalculateFinalRecord() {
    const totalEarnings = Math.round(this.PayArr
      .filter((item: any) => item.isSelected)
      .reduce((sum: number, item: any) => sum + (Number(item.calculated_amount) || 0), 0));

    const totalDeductions = Math.round(this.DedArr
      .filter((item: any) => item.isSelected)
      .reduce((sum: number, item: any) => sum + (Number(item.calculated_amount) || 0), 0));

    const totalEmployeeDeductions = Math.round(this.DedArr
      .filter((item: any) => item.isSelected && !item.component_name.toLowerCase().includes("employer"))
      .reduce((sum: number, item: any) => sum + (Number(item.calculated_amount) || 0), 0));

    const employerContribution = Math.round(this.DedArr
      .filter((item: any) => item.isSelected && item.component_name.toLowerCase().includes("employer"))
      .reduce((sum: number, item: any) => sum + (Number(item.calculated_amount) || 0), 0));
    const FinalDeduction = employerContribution + totalEmployeeDeductions
    this.FinalRecord = {
      totalEarnings,
      totalDeductions,
      employerContribution,
      FinalDeduction,
      gross: totalEarnings,
      netPayableSalary: totalEarnings - totalEmployeeDeductions,
      netCTC: totalEarnings + employerContribution,
    };
  }

  DeductionCheckUncheckAll() {

    this.DedArr.forEach((item: any) => {
      item.isSelected = this.DeductionMasterSelected;


      if (item.original_amount === undefined) {
        item.original_amount = item.calculated_amount;
      }


      item.calculated_amount = item.isSelected ? item.original_amount : 0;
      item.status = item.isSelected ? 'active' : 'inactive';
    });


    this.ComponentList.forEach((item: any) => {
      if (this.DedArr.some((d: any) => d.componentId == item.componentId)) {
        item.isSelected = this.DeductionMasterSelected;
        item.status = this.DeductionMasterSelected ? 'active' : 'inactive';
      }
    });

    this.recalculateFinalRecord();
  }




  // isEarningAllSelected() {
  //   this.EarningMasterSelected = this.PayArr.every((item: any) => item.isSelected);

  //   this.ComponentList = this.ComponentList.map((item: any) => {
  //     // preserve original amount if not already saved
  //     if (item.original_amount === undefined) {
  //       item.original_amount = item.calculated_amount;
  //     }

  //     return {
  //       ...item,
  //       calculated_amount: item.isSelected == false ? 0 : item.original_amount,
  //       status: item.isSelected == false ? 'inactive' : 'active',
  //     };
  //   });

  //   this.PayArr = this.PayArr.map((item: any) => {
  //     // preserve original amount if not already saved
  //     if (item.original_amount === undefined) {
  //       item.original_amount = item.calculated_amount;
  //     }

  //     return {
  //       ...item,
  //       calculated_amount: item.isSelected == false ? 0 : item.original_amount,
  //       status: item.isSelected == false ? 'inactive' : 'active',
  //     };
  //   });


  //   this.recalculateFinalRecord();
  // }
isEarningAllSelected() {
  this.EarningMasterSelected = this.PayArr.every((item: any) => item.isSelected);

  this.PayArr = this.PayArr.map((item: any) => {
    if (item.original_amount === undefined) {
      item.original_amount = item.calculated_amount;
    }

    const isSelected = !!item.isSelected;

    return {
      ...item,
      calculated_amount: isSelected ? item.original_amount : 0,
      status: isSelected ? 'active' : 'inactive',
    };
  });


  this.ComponentList = this.ComponentList.map((comp: any) => {
    const payItem = this.PayArr.find((p: any) => p.componentId == comp.componentId);
    if (!payItem) return comp;

    if (comp.original_amount === undefined) {
      comp.original_amount = comp.calculated_amount;
    }

    const isSelected = !!payItem.isSelected;

    return {
      ...comp,
      calculated_amount: isSelected ? comp.original_amount : 0,
      status: isSelected ? 'active' : 'inactive',
    };
  });

  this.recalculateFinalRecord();
}


  // isDeductionAllSelected() {
  //   this.DeductionMasterSelected = this.DedArr.every((item: any) => item.isSelected);

  //   this.ComponentList = this.ComponentList.map((item: any) => {
  //     if (item.original_amount === undefined) {
  //       item.original_amount = item.calculated_amount;
  //     }

  //     return {
  //       ...item,
  //       calculated_amount: item.isSelected == false ? 0 : item.original_amount,
  //       status: item.isSelected == false ? 'inactive' : 'active',
  //     };
  //   });

  //   this.DedArr = this.DedArr.map((item: any) => {
  //     if (item.original_amount === undefined) {
  //       item.original_amount = item.calculated_amount;
  //     }

  //     return {
  //       ...item,
  //       calculated_amount: item.isSelected == false ? 0 : item.original_amount,
  //       status: item.isSelected == false ? 'inactive' : 'active',
  //     };
  //   });


  //   this.recalculateFinalRecord();
  // }
  isDeductionAllSelected() {
  this.DeductionMasterSelected = this.DedArr.every((item: any) => item.isSelected);

  this.DedArr = this.DedArr.map((item: any) => {
    if (item.original_amount === undefined) {
      item.original_amount = item.calculated_amount;
    }

    const isSelected = !!item.isSelected;

    return {
      ...item,
      calculated_amount: isSelected ? item.original_amount : 0,
      status: isSelected ? 'active' : 'inactive',
    };
  });

  this.ComponentList = this.ComponentList.map((comp: any) => {
    const dedItem = this.DedArr.find((d: any) => d.componentId === comp.componentId); // replace `id` if you use another key

    if (!dedItem) return comp;

    if (comp.original_amount === undefined) {
      comp.original_amount = comp.calculated_amount;
    }

    const isSelected = !!dedItem.isSelected;

    return {
      ...comp,
      calculated_amount: isSelected ? comp.original_amount : 0,
      status: isSelected ? 'active' : 'inactive',
    };
  });

  this.recalculateFinalRecord();
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
  newObj: any = []
  opencreate() {
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
    this.PayArr = []
    this.DedArr = []
    this.variableFlag = false
  }
  variableFlag: any = false
  addVariablePay() {
    this.variableFlag = true

    this.listflag = false
    this.updateFlag = false
    this.PayArr = []
    this.DedArr = []
    this.newObj = {}
  }


  update() {

    this.obj['compArr'] = this.SalArr
    this.obj['employeeId'] = this.personalDetails.id

    this.payrollService.updateSalarySetUp(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);


        if (status === true) {
          this.notyf.success(message)

          this.getSalarySetUpList()
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


  calculateamt() {
    this.obj['finalAmount'] = (this.obj['amount'] * this.obj['typeValue']) / 100

  }
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

}


