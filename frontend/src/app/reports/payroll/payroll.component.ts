import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { ReportsService } from '../../services/reports.service';

const pdfMakeX: any = pdfMake;
pdfMakeX.vfs = (pdfFonts as any).vfs;

interface ColumnDef {
  key: string;
  label: string;
}

@Component({
  selector: 'app-payroll',
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './payroll.component.html',
  styleUrl: './payroll.component.css'
})
export class PayrollComponent {
  notyf: Notyf = new Notyf();

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
    { value: 12, label: 'December' }
  ];
  yearList: number[] = [];

  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  groupBy: 'department' | 'designation' | 'none' = 'none';

  allColumns: ColumnDef[] = [
    { key: 'empCode', label: 'Employee Code' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'fullDays', label: 'Full Days' },
    { key: 'absentDays', label: 'Absent Days' },
    { key: 'leaveTaken', label: 'Leave Taken' },
    { key: 'lateAttendance', label: 'Late Attendance' },
    { key: 'netAmount', label: 'Net Amount' }
  ];
  selectedColumns: string[] = this.allColumns.map(c => c.key);
  isColumnMenuOpen = false;

  grandTotal = 0;
  payrollList: any[] = [];

  searchText: string = '';
  originalList: any[] = [];
  pagedList: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  constructor(
    private reportsService: ReportsService,
    private router: Router
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      this.yearList.push(y);
    }
    this.loadReport();
  }

  loadReport() {
    this.reportsService.getPayrollReport(this.selectedMonth, this.selectedYear).subscribe({
      next: (res: any) => {
        if (res.status === true) {
          this.grandTotal = res.data?.grandTotal || 0;
          const departments = res.data?.departments || [];
          this.payrollList = departments.flatMap((dept: any) =>
            (dept.members || []).map((member: any) => ({ ...member, department: dept.departmentName }))
          );
          this.applySortAndFilter();
          return;
        }
        if (res.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }
        this.notyf.error(res.message || 'Unable to load payroll report');
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Unable to load payroll report');
      }
    });
  }

  onFilterChange() {
    this.loadReport();
  }

  onGroupByChange() {
    this.applySortAndFilter();
  }

  applySortAndFilter() {
    let list = [...this.payrollList];

    if (this.groupBy !== 'none') {
      list.sort((a, b) => String(a[this.groupBy] || '').localeCompare(String(b[this.groupBy] || '')));
    }

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      list = list.filter((item) => JSON.stringify(item).toLowerCase().includes(search));
    }

    this.originalList = list;
    this.currentPage = 1;
    this.updateDisplayedList();
  }

  applyFilter(event: any) {
    this.searchText = (event?.target?.value || '').trim();
    this.applySortAndFilter();
  }

  updateDisplayedList() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.pagedList = this.originalList.slice(start, end);
    this.totalPages = Math.ceil(this.originalList.length / this.itemsPerPage);
  }

  onItemsPerPageChange(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1;
    this.updateDisplayedList();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedList();
  }

  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  isColumnSelected(key: string): boolean {
    return this.selectedColumns.includes(key);
  }

  toggleColumn(key: string) {
    if (this.selectedColumns.includes(key)) {
      if (this.selectedColumns.length === 1) {
        this.notyf.error('At least one column must be selected');
        return;
      }
      this.selectedColumns = this.selectedColumns.filter((c) => c !== key);
    } else {
      this.selectedColumns = [...this.selectedColumns, key];
    }
  }

  get visibleColumns(): ColumnDef[] {
    return this.allColumns.filter((col) => this.selectedColumns.includes(col.key));
  }

  toggleColumnMenu(event: Event) {
    event.stopPropagation();
    this.isColumnMenuOpen = !this.isColumnMenuOpen;
  }

  @HostListener('document:click')
  closeColumnMenu() {
    this.isColumnMenuOpen = false;
  }

  private buildExportRows(): any[] {
    const columns = this.visibleColumns;
    return this.originalList.map((member) => {
      const row: any = {};
      columns.forEach((col) => {
        row[col.label] = member[col.key];
      });
      return row;
    });
  }

  exportExcel(): void {
    const exportData = this.buildExportRows();
    if (!exportData.length) {
      this.notyf.error('No data to export');
      return;
    }

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Payroll Report': worksheet },
      SheetNames: ['Payroll Report']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    const monthLabel = this.monthList.find((m) => m.value === this.selectedMonth)?.label || this.selectedMonth;
    FileSaver.saveAs(blob, `Payroll_Report_${monthLabel}_${this.selectedYear}.xlsx`);
  }

  exportPdf(): void {
    const columns = this.visibleColumns;
    const exportData = this.buildExportRows();
    if (!exportData.length) {
      this.notyf.error('No data to export');
      return;
    }

    const monthLabel = this.monthList.find((m) => m.value === this.selectedMonth)?.label || this.selectedMonth;

    const body = [
      columns.map((col) => col.label),
      ...exportData.map((row) => columns.map((col) => String(row[col.label] ?? '')))
    ];

    const docDefinition: any = {
      pageOrientation: 'landscape',
      content: [
        { text: `Payroll Report - ${monthLabel} ${this.selectedYear}`, style: 'header' },
        { text: `Grand Total: ${this.grandTotal}`, style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: columns.map(() => '*'),
            body
          },
          fontSize: 8
        }
      ],
      styles: {
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
        subheader: { fontSize: 11, bold: true, margin: [0, 0, 0, 10] }
      }
    };

    pdfMake.createPdf(docDefinition).download(`Payroll_Report_${monthLabel}_${this.selectedYear}.pdf`);
  }
}
