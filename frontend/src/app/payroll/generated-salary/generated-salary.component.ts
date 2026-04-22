import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { INotyfNotificationOptions, Notyf } from 'notyf';
import { firstValueFrom } from 'rxjs';
import { MasterService } from '../../services/master.service';
import { PayrollService } from '../../services/payroll.service';
import { StatusService } from '../../services/status.service';
declare let bootstrap: any;
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun } from "docx";
import { saveAs } from "file-saver";
import { toWords } from 'number-to-words';
// Tell TS/ESBuild that pdfMake is dynamic
const pdfMakeX: any = pdfMake;
pdfMakeX.vfs = (pdfFonts as any).vfs;
@Component({
  selector: 'app-generated-salary',
  imports: [NgSelectModule,
    FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './generated-salary.component.html',
  styleUrl: './generated-salary.component.css'
})
export class GeneratedSalaryComponent {
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
  monthObj: any = {
    '1': 'January', '2': 'February', '3': 'March', '4': 'April', '5': 'May', '6': 'June',
    '7': 'July', '8': 'August', '9': 'September', '10': 'October', '11': 'November', '12': 'December'
  }
  yearList: any = [];
  notyf: Notyf;
  obj: any = {}
  constructor(private master: MasterService, private router: Router, private payroll: PayrollService, private statusService: StatusService) {
    this.notyf = new Notyf();
  }
  currency: any
  async ngOnInit() {
    await this.empList()
    await this.getYear();
    this.currency = JSON.parse(localStorage.getItem('currency') || '{}');
  }
  pageSize = 10;
  currentPage = 1;
  searchTerm: any;;
  itemsPerPage = 10;
  onSearch(term: string) {
    if (!term) {
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

  export(): void {
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
  }



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
    // this.SalaryArr=  this.SalaryArr.map({

    // })
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
  totalAmount: any = 0
  onSubmit() {
    this.totalAmount = 0
    this.isLoading = true;
    this.SalaryArr = []
    this.originalList = []
    let newObj = Object.assign({}, this.obj)
    if (newObj['employeeId'] === 'All') {
      newObj['employeeId'] = this.EmpList
        .map((item: any) => item.value)
        .filter((val: any) => val != 'All');
    } else {
      newObj['employeeId'] = [newObj['employeeId']]
    }

    this.payroll.getGeneratedSalaryList(newObj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        this.isLoading = false;
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {

          this.notyf.success(message)
          if (response.data && response.data.salaryList) {
            response.data.salaryList = response.data.salaryList.map((item: any, index: any) => {
              return {
                ...item,
                si_no: index + 1,
              }
            })
          }
          this.SalaryArr = response.data.salaryList
          this.originalList = response.data.salaryList
          this.totalAmount = response.data.totalAmount
          console.log(this.SalaryArr, "salary Array");
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
  personalDetails: any;
  EmployerDedArr: any = []
  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }
  view(item: any) {
    const obj = Object.assign({}, item)
    this.personalDetails = obj

    this.personalDetails['totalWorkingDays'] = this.getDaysInMonth(this.personalDetails.year, this.personalDetails.month)
    console.log(this.personalDetails, "personal detailss");
    this.SalaryBreakup = []
    this.payroll.getBillDetails(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {


          this.notyf.success(message)
          this.SalaryBreakup = response.data

          this.PayArr = []
          this.DedArr = []
          const EmployerDedArr = [];
          this.EmployerDedArr = []
          // Initialize totals
          let totalEarning = 0;
          let totalDeduction = 0;
          let totalEmployerDeduction = 0;

          // Process data in a single loop
          for (const item of this.SalaryBreakup) {
            const amount = Number(item.finalAmount || 0);

            if (item.pay_code == 'PAY') {
              this.PayArr.push(item);
              totalEarning += amount;
            } else if (item.pay_code == 'DED') {
              if (item.name.toLowerCase().includes('employer')) {
                EmployerDedArr.push(item);
                totalEmployerDeduction += amount;
              } else {
                this.DedArr.push(item);
                totalDeduction += amount;
              }
            }
          }



          // Add as new keys
          this.PayArr = [...this.PayArr, { isSummary: true, name: 'Total Earnings', finalAmount: totalEarning.toFixed(0) }];
          this.DedArr = [...this.DedArr, { isSummary: true, name: 'Total Deductions', finalAmount: totalDeduction.toFixed(0) }];
          this.EmployerDedArr = [...EmployerDedArr, { isSummary: true, name: 'Total Employer Deductions', finalAmount: (totalEmployerDeduction).toFixed(0) }];


          const modalEl = document.getElementById('SalaryModal');
          if (modalEl) {
            this.modal = new bootstrap.Modal(modalEl);
            this.modal.show();
          } else {
            console.error('SalaryModal element not found');
          }
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
  revert(item: any) {
    let obj: any = {}
    obj['id'] = item?.id
    obj['bill_id'] = item?.bill_id
    obj["employeeId"] = item?.employeeId
    obj["month"] = item?.month
    obj["year"] = item?.year
    this.payroll.revertSalary(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {
          this.notyf.success(message)
          this.onSubmit()
        }
        else if (status == "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err: { error: { message: string | Partial<INotyfNotificationOptions>; }; }) => {
        console.error('Error:', err);
        this.notyf.error(err.error?.message)
      }
    });
  }
  closeModal() {

    this.modal.hide();
  }

  getPaySlip(item: any) {
    const obj = Object.assign({}, item)
    this.SalaryBreakup = []
    this.payroll.getBillDetails(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {


          // this.notyf.success(message)
          this.SalaryBreakup = response.data
          this.generatePayslip(this.SalaryBreakup, item);


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

    // pdfMake.createPdf(docDefinition).download(`salary_slip_${employee.employeeId}_${salaryData[0].month}_${salaryData[0].year}.pdf`); // direct download
  }

  async getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      };
      img.onerror = error => reject(error);
      img.src = url;
    });
  }


  async generatePayslip(data: any[], employee: any) {
    const earnings = data.filter((d: any) => d.pay_code == 'PAY');
    const deductions = data.filter((d: any) => d.pay_code == 'DED');
    const currentDate = new Date().toLocaleDateString('en-GB');
    let MonthName = this.monthList.filter((item: any) => item.value == employee.month)[0]
    const grossSalary = earnings.reduce((sum: any, e: any) => sum + parseFloat(e.finalAmount), 0);
    const totalDeductions = deductions.reduce((sum: any, d: any) => sum + parseFloat(d.finalAmount), 0);
    const netSalary = grossSalary - totalDeductions;
    const logoBase64 = await this.getBase64ImageFromURL('assets/img/logo/logo-quaere.png');
    // Employee Details block

    const employeeHeadingTable: any = {
      style: 'tableExample',
      table: {
        widths: ['50%', '50%'],
        body: [
          [
            { text: 'Employee Details', fontSize: 10, padding: 15 },
            {
              columns: [
                { text: 'Net Pay', fontSize: 10, padding: 15 },
                { text: `${this.currency?.name} ${netSalary.toFixed(2)}`, fontSize: 10, alignment: 'right', color: '#005495', padding: 15, bold: true }
              ]
            },

            // { text: `Net Pay: $${netSalary.toFixed(2)}`, alignment: 'right' }
          ],

        ]
      },
      layout: {
        hLineWidth: function (i: number, node: any) {
          return 1; // horizontal line thickness
        },
        vLineWidth: function (i: number, node: any) {
          return 1; // vertical line thickness
        },
        hLineColor: function (i: number, node: any) {
          return '#000'; // black horizontal lines
        },
        vLineColor: function (i: number, node: any) {
          return '#000'; // black vertical lines
        },
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4
      },
      margin: [0, 0, 0, 10]

    };

    // Employee Details block
    const employeeDetailsTable: any = {
      style: 'tableExample',
      table: {
        widths: ['50%', '50%'],
        body: [
          [
            { text: `Month : ${MonthName?.label || 'NA'}` },
            { text: `Year : ${employee?.year}` }
          ],
          [
            { text: `Employee Name : ${employee?.employeeName || 'NA'}` },
            { text: `Department : ${employee?.department || 'NA'}` }
          ],

          [
            { text: `Employee Code : ${employee?.empCode || 'NA'}` },
            { text: `E-mail ID : ${employee?.email || 'NA'}` }
          ],
          // [
          //   { text: `IFSC Code : ${employee?.ifscCode || 'NA'}` },
          //   { text: `Bank Account No. : ${employee?.bankAccount || 'NA'}` }
          // ],

          [
            { text: `Contact No : ${employee?.phone || 'NA'}` },
            { text: `Pay Period : ${currentDate}` }
          ],
          [
            { text: `UAN No.: ${employee?.uan_no || 'NA'}` },
            { text: `ESIC No. : ${employee?.esic_no || 'NA'}` }
          ],
          [
            { text: `Designation : ${employee?.designation || 'NA'}` },
            { text: '' }
          ],

        ]
      },
      layout: {
        hLineWidth: function (i: number, node: any) {
          return 1; // horizontal line thickness
        },
        vLineWidth: function (i: number, node: any) {
          return 1; // vertical line thickness
        },
        hLineColor: function (i: number, node: any) {
          return '#000'; // black horizontal lines
        },
        vLineColor: function (i: number, node: any) {
          return '#000'; // black vertical lines
        },
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4
      },
      margin: [0, 0, 0, 5]

    };


    const maxRows = Math.max(earnings.length, deductions.length);
    const tableBody: any[] = [
      [
        { text: 'Earnings', style: 'tableHeader' },
        { text: 'Amount', style: 'tableAmountHeader' },
        { text: 'Deductions', style: 'tableHeader' },
        { text: 'Amount', style: 'tableAmountHeader' }
      ]
    ];

    for (let i = 0; i < maxRows; i++) {
      const earning = earnings[i];
      const deduction = deductions[i];
      tableBody.push([
        earning ? { text: earning.name } : '',
        earning ? { text: earning.finalAmount, alignment: 'right' } : '',
        deduction ? { text: deduction.name } : '',
        deduction ? { text: deduction.finalAmount, alignment: 'right' } : ''
      ]);
    }

    tableBody.push([
      { text: 'Gross Salary', bold: true },
      { text: `${this.currency.name} ${grossSalary.toFixed(2)}`, bold: true, alignment: 'right' },
      { text: 'Total Deductions', bold: true },
      { text: `${this.currency.name} ${totalDeductions.toFixed(2)}`, bold: true, alignment: 'right' }
    ]);

    tableBody.push([
      { text: ``, colSpan: 2, italics: true, alignment: 'left', fillColor: '#f0f0f0' },
      {},
      { text: 'NET Salary', bold: true, fillColor: '#f0f0f0' },
      { text: `${this.currency.name} ${netSalary.toFixed(2)}`, bold: true, alignment: 'right', fillColor: '#f0f0f0' }
    ]);
    tableBody.push([
      {
        colSpan: 4,
        alignment: 'left',
        italics: true
        , fillColor: '#f0f0f0',

        stack: [
          {
            columns: [
              { text: 'NET Salary (In Words):', bold: true, alignment: 'left', italics: true },
              { text: this.convertNumberToWords(netSalary).toUpperCase(), alignment: 'right', bold: true, italics: true }
            ]
          }
        ]
      }, {}, {}, {}
    ]);


    const docDefinition: any = {
      content: [
        {
          image: logoBase64,
          width: 140,

          alignment: 'left',
        },
        {
          columns: [
            { text: 'Quaere eTechnologies Pvt. Ltd.', style: 'header' },
            { text: 'PAY SLIP', bold: true, alignment: 'right', fontWeight: 600, color: '#005495' }
          ]
        },
        // { text: 'Quaere eTechnologies Pvt. Ltd.', style: 'header' },
        { text: 'www.quaeretech.com | +91-522 406 7760', alignment: 'left', fontSize: 10, noWrap: true },
        { text: '7th Floor, Cyber Tower, Pickup Road, Vibhuti Khand, Gomti Nagar, Lucknow-226010', alignment: 'left', fontSize: 10, margin: [0, 0, 0, 10] },
        // { text: `Payslip for the month of ${MonthName?.label} , ${employee?.year}`, alignment: 'center', bold: true, fontSize: 14, margin: [0, 0, 0, 10] },
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }
          ],
          margin: [0, 0, 0, 10]
        },
        // { text: 'SALARY SLIP', style: 'title' },
        employeeHeadingTable,

        employeeDetailsTable,

        {
          style: 'tableExample',
          table: {
            widths: ['*', 'auto', '*', 'auto'],
            body: tableBody
          },
          layout: {
            fillColor: (rowIndex: number) => rowIndex === 0 ? '#f2f2f2' : null,
            hLineColor: () => '#000',
            vLineColor: () => '#000',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4
          }
        },

        // {
        //   columns: [
        //     { text: 'Employee Signature', alignment: 'left', margin: [40, 60, 0, 0] },
        //     { text: 'Employer Signature', alignment: 'right', margin: [0, 60, 40, 0] }
        //   ]
        // }
      ],
      styles: {
        header: { fontSize: 10, fontWeight: 500, alignment: 'left', margin: [0, 0, 0, 0] },
        title: { fontSize: 12, fontWeight: 400, alignment: 'right', margin: [0, 0, 0, 15], decoration: 'underline' },
        tableExample: { margin: [0, 5, 0, 15], fontSize: 10, padding: 15 },
        tableHeader: { fontSize: 12, fontWeight: 400, fillColor: '#f0f0f0', padding: 15 },
        tableAmountHeader: { fontSize: 12, fontWeight: 400, alignment: 'right', fillColor: '#f0f0f0', padding: 15 },

      }
    };
    // pdfMake.createPdf(docDefinition).download(`salary_slip_${employee.employeeId}_${salaryData[0].month}_${salaryData[0].year}.pdf`); // direct download

    pdfMake.createPdf(docDefinition).download(`pay_slip_${employee.empCode}_${employee.employeeName}_${MonthName.label}_${employee.year}.pdf`);
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

  chequeNo: any = '';
async generateDoc() {

  if (this.SalaryArr.length == 0) {
    this.notyf.error('please Submit First then export');
    return;
  }

  if (!this.chequeNo) {
    this.notyf.error("Cheque No is required");
    return;
  }

  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ImageRun,
    Header,
    HorizontalPositionRelativeFrom,
    VerticalPositionRelativeFrom,
    TextWrappingType
  } = await import("docx");

  this.obj['totalAmount'] = this.totalAmount;
  this.obj['chequeNo'] = this.chequeNo;
  this.obj['bill_date'] = new Date();
const today = new Date();

const day = today.getDate();

// function to add st/nd/rd/th
const getOrdinal = (n: number) => {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

const month = today.toLocaleString('en-IN', { month: 'short' });
const year = today.getFullYear();

const formattedDate = `Dated: ${day}${getOrdinal(day)} ${month}, ${year}`;

  this.payroll.SubmitSalaryDoc(this.obj).subscribe(async () => {

    // ======================
    // LOAD IMAGE FUNCTION
    // ======================

    const loadImg = async (path:string,w:number,h:number)=>
      new ImageRun({
        data: await fetch(path).then(r=>r.arrayBuffer()),
        type:'png',
        transformation:{ width:w,height:h }
      });

    const letterhead = new ImageRun({
      data: await fetch('assets/img/Letterhead-1.png').then(r => r.arrayBuffer()),
      type: 'png',
      transformation: { width: 800, height: 1123 },
      floating: {
        behindDocument: true,
        allowOverlap: true,
        horizontalPosition: {
          relative: HorizontalPositionRelativeFrom.PAGE,
          offset: 0
        },
        verticalPosition: {
          relative: VerticalPositionRelativeFrom.PAGE,
          offset: 0
        },
        wrap: {
          type: TextWrappingType.NONE
        }
      }
    });


    // ======================
    // HEADER (LETTERHEAD BACKGROUND)
    // ======================

    const header = new Header({

      children:[
        new Paragraph({
          children: [letterhead]
        })

      ]

    });

    // ======================
    // TABLE DATA
    // ======================

    const rows:any[] = [];

    rows.push(
      new TableRow({
        children:["S.No","Beneficiary Name","Beneficiary Ac No","IFSC","Amt","Remarks"]
        .map(text=> new TableCell({
          children:[ new Paragraph({
            alignment:AlignmentType.CENTER,
            children:[ new TextRun({ text, bold:true }) ]
          })]
        }))
      })
    );

    this.SalaryArr.forEach((emp:any,index:number)=>{

      rows.push(
        new TableRow({
          children:[
            new TableCell({children:[new Paragraph(String(index+1))]}),
            new TableCell({children:[new Paragraph(emp.employeeName||"")]}),
            new TableCell({children:[new Paragraph(emp.bankAccount||"")]}),
            new TableCell({children:[new Paragraph(emp.ifscCode||"")]}),
            new TableCell({children:[new Paragraph(emp.net_amount||"0")]}),
            new TableCell({children:[new Paragraph(`SALARY ${this.monthObj[emp.month]}-${emp.year}`)]}),
          ]
        })
      );

    });

    const table = new Table({
      width:{size:100,type:WidthType.PERCENTAGE},
      rows
    });

    // ======================
    // DOCUMENT
    // ======================

    const doc = new Document({

      sections:[{

        headers:{ default: header },
        properties: {
          page: {
            margin: {
              top: 900,
              right: 720,
              bottom: 720,
              left: 720,
              header: 0,
              footer: 0
            }
          }
        },

        children:[
        // new Paragraph(""),
        new Paragraph({
                      alignment:AlignmentType.RIGHT,
                      children:[
                        new TextRun({
                          text:`${formattedDate}`,
                          // bold:true,
                          size:24
                        })
                      ]
                    }),
          new Paragraph(""),
              new Paragraph(""),
                  new Paragraph(""),
          new Paragraph({
            children: [new TextRun({ text: "To,", bold: true })]
          }),
          new Paragraph({
            children: [new TextRun({ text: "The Branch Manager", bold: true })]
          }),
          new Paragraph({
            children: [new TextRun({ text: "ICICI Bank", bold: true })]
          }),
          new Paragraph({
            children: [new TextRun({ text: "Gomti Nagar, Lucknow", bold: true })]
          }),

          new Paragraph(""),

          new Paragraph({
            alignment:AlignmentType.CENTER,
            children:[ new TextRun({ text:"SUB: Amount Transfer", bold:true, size:28 }) ]
          }),

          new Paragraph(""),
           new Paragraph({
            children:[ new TextRun({
              text:`Respected Sir/ Madam,`,
              bold:true,
              size:22
            })]
          }),
              new Paragraph(""),
          new Paragraph({
            children:[ new TextRun({
              text:`1) Enclosed please find Cheque No.${this.chequeNo} dated ${new Date().toLocaleDateString()} of Rs.${this.totalAmount}/- (${this.convertNumberToWords(this.totalAmount)}). Kindly transfer the amount as per details given below:`,
              size:22
            })]
          }),

          new Paragraph(""),
          table,
          new Paragraph(""),

          new Paragraph({
            alignment:AlignmentType.RIGHT,
            children:[ new TextRun("Shiv Pal Singh") ]
          }),
new Paragraph(""),
          new Paragraph({
            alignment:AlignmentType.RIGHT,
            children:[ new TextRun({ text:"Director",bold:true }) ]
          }),

          new Paragraph(""),
  new Paragraph(""),  new Paragraph(""),  new Paragraph(""),
        ]

      }]
    });

    Packer.toBlob(doc).then(blob=>{
      saveAs(blob,"SalaryTransfer.docx");
    });

  });

}

//   async generateDoc() {

//   if (this.SalaryArr.length == 0) {
//     this.notyf.error('please Submit First then export');
//     return;
//   }

//   if (!this.chequeNo) {
//     this.notyf.error("Cheque No is required");
//     return;
//   }

//   const {
//     Document,
//     Packer,
//     Paragraph,
//     TextRun,
//     AlignmentType,
//     Table,
//     TableRow,
//     TableCell,
//     WidthType,
//     ImageRun,
//     Footer
//   } = await import("docx");

//   this.obj['totalAmount'] = this.totalAmount;
//   this.obj['chequeNo'] = this.chequeNo;
//   this.obj['bill_date'] = new Date();

//   this.payroll.SubmitSalaryDoc(this.obj).subscribe(async (response:any)=>{

//     // ======================
//     // TABLE DATA
//     // ======================

//     const rows:any[] = [];

//     rows.push(
//       new TableRow({
//         children:[
//           "S.No","Beneficiary Name","Beneficiary Ac No","IFSC","Amt","Remarks"
//         ].map(text => new TableCell({
//           children:[ new Paragraph({
//             alignment: AlignmentType.CENTER,
//             children:[ new TextRun({ text, bold:true }) ]
//           })]
//         }))
//       })
//     );

//     this.SalaryArr.forEach((emp:any,index:number)=>{
//       rows.push(
//         new TableRow({
//           children:[
//             new TableCell({children:[new Paragraph(String(index+1))]}),
//             new TableCell({children:[new Paragraph(emp.employeeName||"")]}),
//             new TableCell({children:[new Paragraph(emp.bankAccount||"")]}),
//             new TableCell({children:[new Paragraph(emp.ifscCode||"")]}),
//             new TableCell({children:[new Paragraph(emp.net_amount||"0")]}),
//             new TableCell({children:[new Paragraph(`SALARY ${emp.month}-${emp.year}`)]}),
//           ]
//         })
//       );
//     });

//     const table = new Table({
//       width:{size:100,type:WidthType.PERCENTAGE},
//       rows
//     });

//     // ======================
//     // LOAD IMAGES
//     // ======================

//     const loadImg = async(path:string,w:number,h:number)=> new ImageRun({
//       data: await fetch(path).then(r=>r.arrayBuffer()),
//       type: 'png',
//       transformation:{ width:w, height:h }
//     });

//     const logo = await loadImg('assets/img/logo/logo-quaere.png',120,40);

//     const soc2 = await loadImg('assets/img/footer1.png',45,45);
//     const cmmi = await loadImg('assets/img/footer_2.png',60,40);
//     // const msme = await loadImg('assets/img/footer/msme.png',50,40);
//     // const updesco = await loadImg('assets/img/footer/updesco.png',70,30);

//     // ======================
//     // FOOTER
//     // ======================

//     const footer = new Footer({

//       children:[

//         new Paragraph({
//           border:{ top:{
//             color: "999999", size: 6,
//             style: 'nil'
//           } }
//         }),

//         new Table({
//           width:{size:100,type:WidthType.PERCENTAGE},

//           rows:[ new TableRow({

//             children:[

//               // BLUE BAR
//               new TableCell({
//                 shading:{ fill:"1E73BE" },
//                 width:{ size:3, type:WidthType.PERCENTAGE },
//                 children:[ new Paragraph("") ]
//               }),

//               // COMPANY TEXT
//               new TableCell({
//                 width:{ size:67, type:WidthType.PERCENTAGE },
//                 children:[

//                   new Paragraph({
//                     children:[
//                       new TextRun({ text:"Quaere Technologies Private Limited ", bold:true }),
//                       new TextRun({ text:"AN ISO 9001 : 2015" })
//                     ]
//                   }),

//                   new Paragraph("7th Floor, Cyber Tower, Vibhuti Khand,"),
//                   new Paragraph("Gomti Nagar, Lucknow, U.P.-226010"),
//                   new Paragraph("Web: www.quaeretech.com"),
//                   new Paragraph("E-mail: info@quaeretech.com | Tel: 0522-4067760"),
//                   new Paragraph({
//                     children:[ new TextRun({ text:"GSTN- 09AAACQ1581F1Z1", bold:true }) ]
//                   })

//                 ]
//               }),

//               // ICONS RIGHT
//               new TableCell({
//                 width:{ size:30, type:WidthType.PERCENTAGE },
//                 children:[
//                   new Paragraph({
//                     alignment:AlignmentType.RIGHT,
//                     children:[
//                       soc2,new TextRun(" "),
//                       cmmi,new TextRun(" "),
//                       // msme,new TextRun(" "),
//                       // updesco
//                     ]
//                   })
//                 ]
//               })

//             ]

//           }) ]
//         })

//       ]

//     });

//     // ======================
//     // DOCUMENT
//     // ======================

//     const doc = new Document({

//       sections:[{

//         footers:{ default: footer },

//         children:[

//           new Table({
//             width:{size:100,type:WidthType.PERCENTAGE},
//             rows:[ new TableRow({
//               children:[

//                 new TableCell({
//                   children:[ new Paragraph({ children:[logo] }) ]
//                 }),

//                 new TableCell({
//                   children:[ new Paragraph({
//                     alignment:AlignmentType.RIGHT,
//                     children:[
//                       new TextRun({
//                         text:`Dated: ${new Date().toLocaleDateString()}`,
//                         bold:true,
//                         size:24
//                       })
//                     ]
//                   }) ]
//                 })

//               ]
//             }) ]
//           }),

//           new Paragraph(""),
//           new Paragraph("To,"),
//           new Paragraph("The Branch Manager"),
//           new Paragraph("ICICI Bank"),
//           new Paragraph("Gomti Nagar, Lucknow"),

//           new Paragraph(""),

//           new Paragraph({
//             alignment:AlignmentType.CENTER,
//             children:[
//               new TextRun({
//                 text:"SUB: Amount Transfer",
//                 bold:true,
//                 size:28
//               })
//             ]
//           }),

//           new Paragraph(""),

//           new Paragraph({
//             children:[
//               new TextRun({
//                 text:`1) Enclosed please find Cheque No.${this.chequeNo} dated ${new Date().toLocaleDateString()} of Rs.${this.totalAmount}/- (${this.convertNumberToWords(this.totalAmount)}). Kindly transfer the amount as per details given below:`,
//                 size:22
//               })
//             ]
//           }),

//           new Paragraph(""),
//           table,
//           new Paragraph(""),

//           new Paragraph({
//             alignment:AlignmentType.RIGHT,
//             children:[ new TextRun("Shiv Pal Singh") ]
//           }),

//           new Paragraph({
//             alignment:AlignmentType.RIGHT,
//             children:[ new TextRun({ text:"Director", bold:true }) ]
//           })

//         ]

//       }]
//     });

//     Packer.toBlob(doc).then(blob=>{
//       saveAs(blob,"SalaryTransfer.docx");
//     });

//   });

// }



  // async generateDoc() {

  //   if (this.SalaryArr.length == 0) {
  //     this.notyf.error('please Submit First then export');
  //     return;
  //   }

  //   if (!this.chequeNo) {
  //     this.notyf.error("Cheque No is required");
  //     return;
  //   }

  //   const {
  //     Document,
  //     Packer,
  //     Paragraph,
  //     TextRun,
  //     AlignmentType,
  //     Table,
  //     TableRow,
  //     TableCell,
  //     WidthType,
  //     ImageRun,
  //     Footer
  //   } = await import("docx");

  //   this.obj['totalAmount'] = this.totalAmount;
  //   this.obj['chequeNo'] = this.chequeNo;
  //   this.obj['bill_date'] = new Date();

  //   this.payroll.SubmitSalaryDoc(this.obj).subscribe(async (response: any) => {

  //     const rows: any[] = [];

  //     // ==========================
  //     // TABLE HEADER
  //     // ==========================

  //     rows.push(
  //       new TableRow({
  //         children: [

  //           new TableCell({
  //             children: [new Paragraph({
  //               children: [
  //                 new TextRun({ text: "S.No", bold: true })
  //               ]
  //             })]
  //           }),
  //           new TableCell({
  //             children: [new Paragraph({
  //               children: [
  //                 new TextRun({ text: "Beneficiary Name", bold: true })
  //               ]
  //             })]
  //           }),
  //           new TableCell({
  //             children: [new Paragraph({
  //               children: [
  //                 new TextRun({ text: "Beneficiary Ac No", bold: true })
  //               ]
  //             })]
  //           }),
  //           new TableCell({
  //             children: [new Paragraph({
  //               children: [
  //                 new TextRun({ text: "IFSC", bold: true })
  //               ]
  //             })]
  //           }),
  //           new TableCell({
  //             children: [new Paragraph({
  //               children: [
  //                 new TextRun({ text: "Amt", bold: true })
  //               ]
  //             })]
  //           }),
  //           new TableCell({
  //             children: [new Paragraph({
  //               children: [
  //                 new TextRun({ text: "Remarks", bold: true })
  //               ]
  //             })]
  //           }),

  //           // new TableCell({ children: [new Paragraph({ text: "S.No", bold: true })] }),
  //           // new TableCell({ children: [new Paragraph({ text: "Beneficiary Name", bold: true })] }),
  //           // new TableCell({ children: [new Paragraph({ text: "Beneficiary Ac No", bold: true })] }),
  //           // new TableCell({ children: [new Paragraph({ text: "IFSC", bold: true })] }),
  //           // new TableCell({ children: [new Paragraph({ text: "Amt", bold: true })] }),
  //           // new TableCell({ children: [new Paragraph({ text: "Remarks", bold: true })] }),
  //         ]
  //       })
  //     );

  //     // ==========================
  //     // TABLE DATA
  //     // ==========================

  //     this.SalaryArr.forEach((emp: any, index: number) => {

  //       rows.push(
  //         new TableRow({
  //           children: [
  //             new TableCell({ children: [new Paragraph(String(index + 1))] }),
  //             new TableCell({ children: [new Paragraph(emp.employeeName || '')] }),
  //             new TableCell({ children: [new Paragraph(emp.bankAccount || '')] }),
  //             new TableCell({ children: [new Paragraph(emp.ifscCode || '')] }),
  //             new TableCell({ children: [new Paragraph(emp.net_amount || '0')] }),
  //             new TableCell({ children: [new Paragraph(`SALARY ${emp.month}-${emp.year}`)] }),
  //           ]
  //         })
  //       );

  //     });

  //     const table = new Table({
  //       width: { size: 100, type: WidthType.PERCENTAGE },
  //       rows: rows
  //     });

  //     // ==========================
  //     // LOAD LOGO
  //     // ==========================

  //     const logoBuffer = await fetch('assets/img/logo/logo-quaere.png').then(r => r.arrayBuffer());

  //     const logo = new ImageRun({
  //       data: logoBuffer,
  //       type: "png",
  //       transformation: {
  //         width: 120,
  //         height: 40
  //       }
  //     });

  //     // ==========================
  //     // CREATE DOCUMENT
  //     // ==========================

  //     const doc = new Document({

  //       sections: [
  //         {

  //           footers: {
  //             default: new Footer({
  //               children: [
  //                 new Paragraph({
  //                   alignment: AlignmentType.CENTER,
  //                   children: [
  //                     new TextRun({
  //                       text: "Quaere Technologies Private Limited | Gomti Nagar, Lucknow",
  //                       size: 18
  //                     })
  //                   ]
  //                 })
  //               ]
  //             })
  //           },

  //           children: [

  //             // HEADER TABLE (LOGO + DATE)

  //             new Table({
  //               width: { size: 100, type: WidthType.PERCENTAGE },
  //               rows: [
  //                 new TableRow({
  //                   children: [

  //                     new TableCell({
  //                       children: [new Paragraph({ children: [logo] })]
  //                     }),

  //                     new TableCell({
  //                       children: [
  //                         new Paragraph({
  //                           alignment: AlignmentType.RIGHT,
  //                           children: [
  //                             new TextRun({
  //                               text: `Dated: ${new Date().toLocaleDateString()}`,
  //                               bold: true,
  //                               size: 24
  //                             })
  //                           ]
  //                         })
  //                       ]
  //                     })

  //                   ]
  //                 })
  //               ]
  //             }),

  //             new Paragraph(""),
  //             new Paragraph({
  //               children: [
  //                 new TextRun({ text: "Hello world", bold: true })
  //               ]
  //             }),
  //             // new Paragraph({ text: "To,", bold: true }),
  //             new Paragraph("The Branch Manager"),
  //             new Paragraph("ICICI Bank"),
  //             new Paragraph("Gomti Nagar, Lucknow"),

  //             new Paragraph(""),

  //             // SUBJECT CENTER

  //             new Paragraph({
  //               alignment: AlignmentType.CENTER,
  //               children: [
  //                 new TextRun({
  //                   text: "SUB: Amount Transfer",
  //                   bold: true,
  //                   size: 28
  //                 })
  //               ]
  //             }),

  //             new Paragraph(""),

  //             new Paragraph({
  //               children: [
  //                 new TextRun({
  //                   text: `1) Enclosed please find Cheque No.${this.chequeNo} dated ${new Date().toLocaleDateString()} of Rs.${this.totalAmount}/- (${this.convertNumberToWords(this.totalAmount)}). Kindly transfer the amount as per details given below:`,
  //                   size: 22
  //                 })
  //               ]
  //             }),

  //             new Paragraph(""),

  //             table,

  //             new Paragraph(""),

  //             new Paragraph({
  //               alignment: AlignmentType.RIGHT,
  //               children: [new TextRun("Shiv Pal Singh")]
  //             }),

  //             new Paragraph({
  //               alignment: AlignmentType.RIGHT,
  //               children: [new TextRun({ text: "Director", bold: true })]
  //             })

  //           ]
  //         }
  //       ]
  //     });

  //     // ==========================
  //     // DOWNLOAD FILE
  //     // ==========================

  //     Packer.toBlob(doc).then(blob => {
  //       saveAs(blob, "SalaryTransfer.docx");
  //     });

  //   });

  // }


  // generateDoc() {
  //   if (this.SalaryArr.length == 0) {
  //     this.notyf.error('please Submit First then export')
  //     return
  //   }
  //   if (!this.chequeNo) {
  //     this.notyf.error("Cheque No is required")
  //     return
  //   }
  //   this.obj['totalAmount'] = this.totalAmount
  //   this.obj['chequeNo'] = this.chequeNo
  //   this.obj['bill_date'] = new Date().getDate()
  //   this.payroll.SubmitSalaryDoc(this.obj).subscribe({
  //     next: (response: any) => {
  //       console.log('response', response);

  //       let message = response.message ? response.message : 'Data found Successfully';
  //       let status = this.statusService.handleResponseStatus(response.status, message);
  //       console.log(status)
  //       console.log("response", response);

  //       if (status == true) {


  //         const rows = [];

  //         // Table Header
  //         rows.push(
  //           new TableRow({
  //             children: [
  //               new TableCell({ children: [new Paragraph("S.No")] }),
  //               new TableCell({ children: [new Paragraph("Beneficiary Name")] }),
  //               new TableCell({ children: [new Paragraph("Beneficiary Ac No")] }),
  //               new TableCell({ children: [new Paragraph("IFSC")] }),
  //               new TableCell({ children: [new Paragraph("Amt")] }),
  //               new TableCell({ children: [new Paragraph("Remarks")] }),
  //             ]
  //           })
  //         );

  //         // Dynamic rows from salary data
  //         this.SalaryArr.forEach((emp: any, index: any) => {

  //           rows.push(
  //             new TableRow({
  //               children: [
  //                 new TableCell({ children: [new Paragraph(String(index + 1))] }),
  //                 new TableCell({ children: [new Paragraph(emp.employeeName || '')] }),
  //                 new TableCell({ children: [new Paragraph(emp.bankAccount || '')] }),
  //                 new TableCell({ children: [new Paragraph(emp.ifscCode || '')] }),
  //                 new TableCell({ children: [new Paragraph(emp.net_amount || '0')] }),
  //                 new TableCell({ children: [new Paragraph(`SALARY ${emp.month}-${emp.year}`)] }),
  //               ]
  //             })
  //           );

  //         });

  //         const table = new Table({
  //           width: { size: 100, type: WidthType.PERCENTAGE },
  //           rows: rows
  //         });

  //         // Create Document
  //         const doc = new Document({

  //           sections: [{
  //             children: [

  //               new Paragraph("Dated: " + new Date().toLocaleDateString()),

  //               new Paragraph(""),
  //               new Paragraph("To,"),
  //               new Paragraph("The Branch Manager"),
  //               new Paragraph("ICICI Bank"),
  //               new Paragraph("Gomti Nagar, Lucknow"),

  //               new Paragraph(""),
  //               new Paragraph("SUB: Amount Transfer"),

  //               new Paragraph(""),

  //               new Paragraph({
  //                 children: [
  //                   new TextRun(`1) Enclosed please find Cheque No.${this.chequeNo} Dated:-${new Date().getDate()}  of Rs.${this.totalAmount}/-(${this.convertNumberToWords(this.totalAmount)}) . Kindly transfer the amount as per details given below:`)
  //                 ]
  //               }),

  //               new Paragraph(""),

  //               table

  //             ]
  //           }]
  //         });

  //         // Download
  //         Packer.toBlob(doc).then(blob => {
  //           saveAs(blob, "SalaryTransfer.docx");
  //         });



  //       }
  //       else if (status == "expired") {
  //         this.router.navigate(["login"]);
  //       }

  //       else {
  //         this.notyf.error(message)
  //       }

  //     },
  //     error: (err) => {
  //       console.error('Error:', err);
  //       this.notyf.error(err.error?.message)
  //     }
  //   });



  // }


}
