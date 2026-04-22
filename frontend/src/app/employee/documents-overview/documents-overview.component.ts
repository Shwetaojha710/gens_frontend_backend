import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';

@Component({
  selector: 'app-documents-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchPaginationComponent],
  templateUrl: './documents-overview.component.html',
  styleUrl: './documents-overview.component.css',
})
export class DocumentsOverviewComponent implements OnInit {
  employees: any[] = [];
  filteredEmployees: any[] = [];
  pagedEmployees: any[] = [];
  loading = false;

  currentPage = 1;
  pageSize = 10;
  searchTerm = '';

  counts: any = { appointment: 0, nda: 0, relieving: 0, offer: 0 };
  employeeMap: any = {};

  readonly docTypes = [
    { key: 'appointment', label: 'Appointment Letter', icon: 'fas fa-file-signature', route: 'appointment-letter', color: '#005fa8' },
    { key: 'nda',         label: 'NDA',                icon: 'fas fa-file-contract',  route: 'nda',               color: '#7c3aed' },
    { key: 'offer',       label: 'Offer Letter',       icon: 'fas fa-envelope-open-text', route: 'offer-letter',  color: '#b45309' },
    { key: 'relieving',   label: 'Relieving Letter',   icon: 'fas fa-file-alt',       route: 'releving-letter',   color: '#0f766e' },
  ] as const;

  constructor(
    private employeeService: EmployeeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadStats();
  }

  loadStats(): void {
    this.employeeService.getLetterStats().subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.counts = res.data.counts || { appointment: 0, nda: 0, relieving: 0, offer: 0 };
          this.employeeMap = res.data.employeeMap || {};
        }
      },
      error: () => {}
    });
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService.getEmp().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status === true) {
          this.employees = res.data?.formattedActiveEmps || res.data?.formattedEmps || [];
          this.applyFilter();
        }
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilter(): void {
    const q = this.searchTerm.toLowerCase().trim();
    this.filteredEmployees = q
      ? this.employees.filter((e) =>
          `${e.firstName} ${e.lastName} ${e.empCode} ${e.designation_name} ${e.department_name}`
            .toLowerCase().includes(q))
      : [...this.employees];
    this.currentPage = 1;
    this.updatePage();
  }

  updatePage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedEmployees = this.filteredEmployees.slice(start, start + this.pageSize);
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePage();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.updatePage();
  }

  openLetter(employee: any, routeKey: string): void {
    localStorage.setItem('employeeId', JSON.stringify(employee));
    this.router.navigate([`/layout/employee/add/profile/professional-info/${routeKey}`]);
  }

  isGenerated(employeeId: string, docKey: string): boolean {
    return !!this.employeeMap[employeeId]?.[docKey];
  }

  generatedDate(employeeId: string, docKey: string): string {
    const iso = this.employeeMap[employeeId]?.[docKey];
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get totalEmployees(): number { return this.employees.length; }
}
