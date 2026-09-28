import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-employee',
  imports: [CommonModule, FormsModule],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.css'
})
export class EmployeeComponent {
  notyf: Notyf = new Notyf();

  statusFilter: string = 'active';
  groupBy: 'department' | 'designation' | 'none' = 'none';

  allColumns: ColumnDef[] = [
    { key: 'empCode', label: 'Employee Code' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'gender', label: 'Gender' },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'joiningDate', label: 'Joining Date' },
    { key: 'status', label: 'Status' }
  ];
  selectedColumns: string[] = this.allColumns.map(c => c.key);
  isColumnMenuOpen = false;

  totalEmployees = 0;
  employees: any[] = [];

  searchText: string = '';
  originalList: any[] = [];
  pagedEmployees: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  constructor(
    private reportsService: ReportsService,
    private router: Router
  ) {
    this.loadReport();
  }

  loadReport() {
    this.reportsService.getEmployeeReport(this.statusFilter).subscribe({
      next: (res: any) => {
        if (res.status === true) {
          this.totalEmployees = res.data?.totalEmployees || 0;
          this.employees = res.data?.employees || [];
          this.applySortAndFilter();
          return;
        }
        if (res.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }
        this.notyf.error(res.message || 'Unable to load employee report');
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Unable to load employee report');
      }
    });
  }

  onStatusChange() {
    this.loadReport();
  }

  onGroupByChange() {
    this.applySortAndFilter();
  }

  applySortAndFilter() {
    let list = [...this.employees];

    if (this.groupBy !== 'none') {
      const field = this.groupBy === 'department' ? 'department' : 'designation';
      list.sort((a, b) => String(a[field] || '').localeCompare(String(b[field] || '')));
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
    this.pagedEmployees = this.originalList.slice(start, end);
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

  getStatusBadge(status: string): string {
    return status === 'active' ? 'bg-label-success' : 'bg-label-danger';
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
    return this.originalList.map((employee) => {
      const row: any = {};
      columns.forEach((col) => {
        row[col.label] = employee[col.key];
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
      Sheets: { 'Employee Report': worksheet },
      SheetNames: ['Employee Report']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(blob, 'Employee_Report.xlsx');
  }

  exportPdf(): void {
    const columns = this.visibleColumns;
    const exportData = this.buildExportRows();
    if (!exportData.length) {
      this.notyf.error('No data to export');
      return;
    }

    const body = [
      columns.map((col) => col.label),
      ...exportData.map((row) => columns.map((col) => String(row[col.label] ?? '')))
    ];

    const docDefinition: any = {
      pageOrientation: 'landscape',
      content: [
        { text: 'Employee Report', style: 'header' },
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
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] }
      }
    };

    pdfMake.createPdf(docDefinition).download('Employee_Report.pdf');
  }
}
