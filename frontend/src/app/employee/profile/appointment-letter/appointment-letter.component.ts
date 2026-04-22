import { Component } from '@angular/core';
import { Notyf } from 'notyf';
import { DataService } from '../../../services/data.service';
import { StatusService } from '../../../services/status.service';
import { PayrollService } from '../../../services/payroll.service';
import { EmployeeService } from '../../../services/employee.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-appointment-letter',
  imports: [CommonModule,FormsModule,DatePipe],
  templateUrl: './appointment-letter.component.html',
  styleUrl: './appointment-letter.component.css'
})
export class AppointmentLetterComponent {

  isEdit = false;
  personalDetails:any={}
  tenant:any={}
     notyf: Notyf;
     minDate:any
     currency:any
     newObj:any
     obj:any={}
 constructor(
public payrollService: PayrollService, private router: Router, public statusService: StatusService, public dataService: DataService, private employeeService: EmployeeService
  ) {

    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

    const today = new Date();
    this.minDate = today.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.currency = JSON.parse(localStorage.getItem('currency') || '{}');

    this.obj['status'] = 'active';
    this.getSalarySetUpList();
    this.ComponentDropdown();
    this.loadData();
  }

  loadData(): void {
    this.employeeService.getLetterData(this.personalDetails.id, 'appointment').subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          if (res.data.joiningDate) this.personalDetails.joiningDate = res.data.joiningDate;
          if (res.data.ref_no) this.personalDetails.ref_no = res.data.ref_no;
          if (res.data.designation) this.personalDetails.designation = res.data.designation;
          if (res.data.salaryTable) this.salaryTable = res.data.salaryTable;
          if (res.data.ctc != null) this.ctc = res.data.ctc;
        }
      },
      error: () => {}
    });
  }

  saveData(): void {
    this.employeeService.saveLetterData(this.personalDetails.id, 'appointment', {
      joiningDate: this.personalDetails.joiningDate,
      ref_no: this.personalDetails.ref_no,
      designation: this.personalDetails.designation,
      salaryTable: this.salaryTable,
      ctc: this.ctc
    }).subscribe({ error: () => {} });
  }
    async ngOnInit() {
  }
  ComponentDD = []
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
    getToDateMin(): string {
    return this.newObj['startDate'] || this.minDate;
  }

   SalArr: any = []
  basic: any = []
  DedArr: any = []
  PayArr: any = []
  deductionArr: any = []
  EarningArr: any = []
  ctc:any=0
  totalDeductible:any=0
  ComponentList:any = []
  totalPayable:any=0
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
          this.SalArr=response.data
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

          // this.updateMasterSelected();
             // ✅ ADD THIS
   this.prepareSalaryTable();
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
  salaryTable: any = {
  earnings: [],
  deductions: [],
  totalEarning: 0,
  totalDeduction: 0,
  netSalary: 0
};
  convertNumberToWords(amount: number): string {
    if (amount === 0) return 'zero';
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
prepareSalaryTable() {
  const earnings = this.SalArr.filter((x:any) => x.component_type === 'Earning' );
  const deductions = this.SalArr.filter((x:any) => x.component_type === 'deductible');

  let totalEarning = 0;
  let totalDeduction = 0;

  earnings.forEach((e: any) => {
    totalEarning += Number(e.finalAmount || 0);
  });

  deductions.forEach((d: any) => {
    totalDeduction += Number(d.finalAmount || 0);
  });

  this.salaryTable = {
    earnings,
    deductions,
    totalEarning,
    totalDeduction,
    netSalary: totalEarning - totalDeduction
  };
  console.log(this.salaryTable);

}
masterSelected:any

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
  data = {
    refNo: 'HR/2026/001',
    date: '18 March 2026',
    employeeName: 'Abhishek Shukla',
    address: 'Lucknow, UP',
    designation: 'Software Developer',
    companyName: 'Quaere Etechnologies Pvt Ltd',
    location: 'Lucknow',
    joiningDate: '01 April 2026',
    probation: 3,
    noticePeriod: 30,

    hrName: 'Shiv Pal Singh',

    salary: {
      basic: '15000',
      hra: '5000',
      allowance: '3000',
      total: '23000'
    }
  };

  toggleEdit() {
    this.isEdit = !this.isEdit;
  }
isDownload:any=false
downloadDoc() {
this.isDownload=true
  const element = document.getElementById('appointment-doc');
  if (!element) return;

  // const cloned = element.cloneNode(true) as HTMLElement;
// Clone so we can modify before download
  const cloned = element.cloneNode(true) as HTMLElement;

  // 🔥 Replace input fields with values
  const inputs = cloned.querySelectorAll('input');

  inputs.forEach((input: any) => {
    const value = input.value || '';
    const span = document.createElement('span');
    span.innerText = value;
    input.parentNode.replaceChild(span, input);
  });
  const html = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'>
  <head>
    <meta charset='utf-8'>
    <style>
      body { font-family: 'Times New Roman'; line-height:1.6; }
      table { border-collapse: collapse; width:100%; }
      th, td { border:1px solid black; padding:5px; }
      .highlight { background: yellow; font-weight: bold; }
      .page-break { page-break-before: always; }
    </style>
  </head>
  <body>
    ${cloned.innerHTML}
  </body>
  </html>
  `;

  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `Appointment_${this.data.employeeName}.doc`;
  a.click();

  URL.revokeObjectURL(url);

this.isDownload=false
}

printDoc() {
  const element = document.getElementById('appointment-doc');
  if (!element) return;

  const cloned = element.cloneNode(true) as HTMLElement;

  // Replace inputs with their typed values
  cloned.querySelectorAll('input').forEach((input: any) => {
    const span = document.createElement('span');
    span.innerText = input.value || '';
    input.parentNode.replaceChild(span, input);
  });

  // <br style="page-break-before:always"> inside <ol> is invalid HTML and breaks
  // iframe rendering. Replace each with a proper block-level div page-break.
  cloned.querySelectorAll('br[style*="page-break-before"]').forEach((br: any) => {
    const div = document.createElement('div');
    div.style.cssText = 'page-break-before:always;break-before:page;height:0;';
    br.parentNode.replaceChild(div, br);
  });

  const content = `<!DOCTYPE html><html><head><title>Appointment Letter</title><style>
    @page { margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: 'Times New Roman'; font-size: 14px; line-height: 1.6; padding: 15mm 20mm; color: #000; background: #fff; }
    h3 { text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 30px; }
    h4 { text-align: center; }
    h4 + *, h4 + table { page-break-before: avoid; }
    table { width: 100%; border-collapse: collapse; }
    .header-table td { vertical-align: top; border: none !important; }
    .salary-table th, .salary-table td { border: 1px solid black; padding: 4px; font-size: 12px; }
    .salary-table tr { page-break-inside: avoid; }
    ol { padding-left: 20px; margin-top: 10px; }
    li { font-size: 14px; margin-bottom: 6px; page-break-inside: avoid; }
    p { font-size: 12px; margin: 6px 0; }
    @media print {
      .salary-table th, .salary-table td { border: 1px solid black; }
      .salary-table tr { page-break-inside: avoid; }
      li { page-break-inside: avoid; }
    }
  </style></head><body>${cloned.innerHTML}</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
  iframe.setAttribute('srcdoc', content);
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}
}
