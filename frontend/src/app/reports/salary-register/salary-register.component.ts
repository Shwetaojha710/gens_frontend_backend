import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import { ReportsService } from '../../services/reports.service';

interface ColumnDef {
  key: string;
  label: string;
  group?: string;
  tone?: 'green' | 'purple' | 'orange' | 'net' | 'default' | 'header';
}

@Component({
  selector: 'app-salary-register',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './salary-register.component.html',
  styleUrl: './salary-register.component.css',
})
export class SalaryRegisterComponent {
  notyf = new Notyf();

  monthList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  yearList: number[] = [];

  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();

  loading = false;
  rows: any[] = [];
  filteredRows: any[] = [];
  totals: Record<string, number> = {};
  summary = {
    employeeCount: 0,
    totalGross: 0,
    totalNetPayable: 0,
    totalCtc: 0,
  };

  leaveDeductionDetails: any[] = [];
  otherDeductionDetails: any[] = [];
  reimbursementDetails: any[] = [];

  searchText = '';

  columns: ColumnDef[] = [
    { key: 'sno', label: 'S. No.', group: 'identity' },
    { key: 'name', label: 'Name', group: 'identity' },
    { key: 'empCode', label: 'Emp Code', group: 'identity' },
    { key: 'oldSalary', label: 'Old Salary', group: 'appraisal' },
    { key: 'appraisalPercent', label: 'Appraisal %', group: 'appraisal', tone: 'green' },
    { key: 'salaryAfterAppraisal', label: 'Salary After Appraisal', group: 'appraisal', tone: 'green' },
    { key: 'leaveDeduction', label: 'Deductions (Leave)', group: 'deductions', tone: 'purple' },
    { key: 'otherDeduction', label: 'Deductions (Others)', group: 'deductions', tone: 'purple' },
    { key: 'tds', label: 'Deductions (TDS)', group: 'deductions', tone: 'purple' },
    { key: 'totalDeductions', label: 'Total Deductions', group: 'deductions', tone: 'purple' },
    { key: 'salaryAfterDeduction', label: 'Salary After Deduction', group: 'deductions', tone: 'green' },
    { key: 'basic', label: 'Basic Salary', group: 'earnings' },
    { key: 'da', label: 'DA', group: 'earnings' },
    { key: 'hra', label: 'HRA', group: 'earnings' },
    { key: 'misc', label: 'Misc. Allowance', group: 'earnings' },
    { key: 'medical', label: 'Medical Allow.', group: 'earnings' },
    { key: 'conveyance', label: 'Conveyance', group: 'earnings' },
    { key: 'education', label: 'Education', group: 'earnings' },
    { key: 'performanceBonus', label: 'Perf. Bonus + LTA', group: 'earnings' },
    { key: 'grossSalary', label: 'Gross Salary', group: 'earnings', tone: 'green' },
    { key: 'pfEmployee', label: 'PF Emp @12%', group: 'statutory', tone: 'orange' },
    { key: 'esiEmployee', label: 'ESI Emp @0.75%', group: 'statutory', tone: 'orange' },
    { key: 'totalPfEsiEmployee', label: 'Total PF & ESI', group: 'statutory', tone: 'orange' },
    { key: 'netPayable', label: 'Net Payable', group: 'result', tone: 'net' },
    { key: 'pfEmployer', label: 'PF Employer @12%', group: 'result' },
    { key: 'esiEmployer', label: 'ESI Employer @3.25%', group: 'result' },
    { key: 'totalEarningCtc', label: 'Total Earning (CTC)', group: 'result', tone: 'green' },
  ];

  private readonly excelColors: Record<string, string> = {
    header: '1F4E79',
    green: 'C6EFCE',
    purple: 'E2D5F1',
    orange: 'FCE4D6',
    net: '92D050',
    total: 'D9E2F3',
    leaveHead: 'A9D08E',
    otherHead: 'FFC000',
    white: 'FFFFFF',
  };

  constructor(
    private reportsService: ReportsService,
    private router: Router,
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      this.yearList.push(y);
    }
    this.loadReport();
  }

  get monthLabel(): string {
    return this.monthList.find((m) => m.value === this.selectedMonth)?.label || '';
  }

  loadReport(): void {
    this.loading = true;
    this.reportsService.getSalaryRegisterReport(this.selectedMonth, this.selectedYear).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.status === true) {
          this.rows = res.data?.rows || [];
          this.totals = res.data?.totals || {};
          this.summary = res.data?.summary || {
            employeeCount: 0,
            totalGross: 0,
            totalNetPayable: 0,
            totalCtc: 0,
          };
          this.leaveDeductionDetails = res.data?.leaveDeductionDetails || [];
          this.otherDeductionDetails = res.data?.otherDeductionDetails || [];
          this.reimbursementDetails = res.data?.reimbursementDetails || [];
          this.applyFilter();
          return;
        }
        if (res.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }
        this.rows = [];
        this.filteredRows = [];
        this.leaveDeductionDetails = [];
        this.otherDeductionDetails = [];
        this.reimbursementDetails = [];
        this.notyf.error(res.message || 'Unable to load salary register');
      },
      error: (err: any) => {
        this.loading = false;
        this.rows = [];
        this.filteredRows = [];
        this.leaveDeductionDetails = [];
        this.otherDeductionDetails = [];
        this.reimbursementDetails = [];
        this.notyf.error(err?.error?.message || 'Unable to load salary register');
      },
    });
  }

  onFilterChange(): void {
    this.loadReport();
  }

  applyFilter(event?: Event): void {
    const value =
      event && (event.target as HTMLInputElement)?.value != null
        ? (event.target as HTMLInputElement).value
        : this.searchText;
    this.searchText = String(value || '').trim().toLowerCase();

    if (!this.searchText) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows.filter((row) => {
      const hay = `${row.name || ''} ${row.empCode || ''} ${row.department || ''} ${row.designation || ''}`.toLowerCase();
      return hay.includes(this.searchText);
    });
  }

  cellClass(col: ColumnDef): string {
    if (col.tone === 'green') return 'sr-cell sr-cell--green';
    if (col.tone === 'purple') return 'sr-cell sr-cell--purple';
    if (col.tone === 'orange') return 'sr-cell sr-cell--orange';
    if (col.tone === 'net') return 'sr-cell sr-cell--net';
    return 'sr-cell';
  }

  isMoney(key: string): boolean {
    return !['sno', 'name', 'empCode', 'appraisalPercent'].includes(key);
  }

  private excelFill(hex: string, bold = false, fontColor = '000000') {
    return {
      fill: { patternType: 'solid', fgColor: { rgb: hex } },
      font: { bold, color: { rgb: fontColor }, name: 'Calibri', sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'B0B0B0' } },
        bottom: { style: 'thin', color: { rgb: 'B0B0B0' } },
        left: { style: 'thin', color: { rgb: 'B0B0B0' } },
        right: { style: 'thin', color: { rgb: 'B0B0B0' } },
      },
    };
  }

  private toneHex(tone?: ColumnDef['tone']): string {
    if (tone === 'green') return this.excelColors['green'];
    if (tone === 'purple') return this.excelColors['purple'];
    if (tone === 'orange') return this.excelColors['orange'];
    if (tone === 'net') return this.excelColors['net'];
    return this.excelColors['white'];
  }

  private styleCell(cell: XLSX.CellObject | undefined, style: any): void {
    if (!cell) return;
    cell.s = style;
  }

  exportExcel(): void {
    if (!this.filteredRows.length) {
      this.notyf.error('No data to export');
      return;
    }

    const title = `Salary Register — ${this.monthLabel}, ${this.selectedYear}`;
    const header = this.columns.map((c) => c.label);
    const dataRows = this.filteredRows.map((row) =>
      this.columns.map((col) => {
        if (col.key === 'sno' || col.key === 'name' || col.key === 'empCode') {
          return row[col.key] ?? '';
        }
        return Number(row[col.key]) || 0;
      }),
    );
    const totalRow = this.columns.map((col) => {
      if (col.key === 'sno') return 'TOTAL';
      if (col.key === 'name' || col.key === 'empCode' || col.key === 'appraisalPercent') return '';
      return Number(this.totals[col.key]) || 0;
    });

    const aoa: any[][] = [[title], [], header, ...dataRows, totalRow];

    // Spacer then Leave Deduction Details
    aoa.push([]);
    aoa.push(['Leave Deduction Details']);
    aoa.push(['Employee Name', 'Amount (₹)', 'No. of Day', 'Reason']);
    if (this.leaveDeductionDetails.length) {
      for (const item of this.leaveDeductionDetails) {
        aoa.push([
          item.employeeName || '',
          Number(item.amount) || 0,
          item.daysLabel || `${item.days || 0} Day(s)`,
          item.reason || '',
        ]);
      }
    } else {
      aoa.push(['—', '', '', 'No leave deductions']);
    }

    aoa.push([]);
    aoa.push(['Deductions']);
    aoa.push(['Employee Name', 'Amount (₹)', 'Reason']);
    if (this.otherDeductionDetails.length) {
      for (const item of this.otherDeductionDetails) {
        aoa.push([item.employeeName || '', Number(item.amount) || 0, item.reason || '']);
      }
    } else {
      aoa.push(['—', '', 'No other deductions']);
    }

    aoa.push([]);
    aoa.push(['Reimbursement']);
    aoa.push(['Employee Name', 'Amount (₹)', 'Reason']);
    if (this.reimbursementDetails.length) {
      for (const item of this.reimbursementDetails) {
        aoa.push([item.employeeName || '', Number(item.amount) || 0, item.reason || '']);
      }
    } else {
      aoa.push(['—', '', 'No reimbursements']);
    }

    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];
    sheet['!cols'] = this.columns.map((col) => ({
      wch: Math.min(28, Math.max(12, col.label.length + 2)),
    }));

    // Title
    this.styleCell(sheet['A1'], {
      ...this.excelFill(this.excelColors['header'], true, 'FFFFFF'),
      alignment: { horizontal: 'center', vertical: 'center' },
      font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Calibri', sz: 14 },
    });

    const headerRowIndex = 2; // 0-based
    const firstDataRow = 3;
    const totalRowIndex = firstDataRow + dataRows.length;

    // Main header + data + total colors
    for (let c = 0; c < this.columns.length; c++) {
      const col = this.columns[c];
      const headerAddr = XLSX.utils.encode_cell({ r: headerRowIndex, c });
      this.styleCell(sheet[headerAddr], this.excelFill(this.excelColors['header'], true, 'FFFFFF'));

      for (let r = firstDataRow; r < totalRowIndex; r++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        this.styleCell(sheet[addr], this.excelFill(this.toneHex(col.tone), false));
      }

      const totalAddr = XLSX.utils.encode_cell({ r: totalRowIndex, c });
      this.styleCell(
        sheet[totalAddr],
        this.excelFill(this.excelColors['total'], true),
      );
    }

    // Style section blocks by scanning aoa for known titles
    const styleSection = (titleText: string, headColor: string, colCount: number) => {
      const titleIdx = aoa.findIndex((row) => row[0] === titleText);
      if (titleIdx < 0) return;
      for (let c = 0; c < colCount; c++) {
        this.styleCell(
          sheet[XLSX.utils.encode_cell({ r: titleIdx, c })],
          this.excelFill(headColor, true, headColor === this.excelColors['otherHead'] ? '000000' : '000000'),
        );
      }
      const headIdx = titleIdx + 1;
      for (let c = 0; c < colCount; c++) {
        this.styleCell(
          sheet[XLSX.utils.encode_cell({ r: headIdx, c })],
          this.excelFill(headColor, true),
        );
      }
    };

    styleSection('Leave Deduction Details', this.excelColors['leaveHead'], 4);
    styleSection('Deductions', this.excelColors['otherHead'], 3);
    styleSection('Reimbursement', this.excelColors['otherHead'], 3);

    // Merge section titles
    const leaveTitleIdx = aoa.findIndex((row) => row[0] === 'Leave Deduction Details');
    const dedTitleIdx = aoa.findIndex((row) => row[0] === 'Deductions');
    const remTitleIdx = aoa.findIndex((row) => row[0] === 'Reimbursement');
    sheet['!merges'] = sheet['!merges'] || [];
    if (leaveTitleIdx >= 0) {
      sheet['!merges'].push({ s: { r: leaveTitleIdx, c: 0 }, e: { r: leaveTitleIdx, c: 3 } });
    }
    if (dedTitleIdx >= 0) {
      sheet['!merges'].push({ s: { r: dedTitleIdx, c: 0 }, e: { r: dedTitleIdx, c: 2 } });
    }
    if (remTitleIdx >= 0) {
      sheet['!merges'].push({ s: { r: remTitleIdx, c: 0 }, e: { r: remTitleIdx, c: 2 } });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Salary Register');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    FileSaver.saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `salary-register-${this.selectedMonth}-${this.selectedYear}.xlsx`,
    );
  }
}
