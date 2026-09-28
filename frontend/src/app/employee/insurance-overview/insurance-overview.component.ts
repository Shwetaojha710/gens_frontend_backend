import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import { InsuranceDocumentsComponent } from '../profile/insurance-documents/insurance-documents.component';

@Component({
  selector: 'app-insurance-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchPaginationComponent, InsuranceDocumentsComponent],
  templateUrl: './insurance-overview.component.html',
  styleUrl: './insurance-overview.component.css',
})
export class InsuranceOverviewComponent implements OnInit {
  employees: any[] = [];
  filteredEmployees: any[] = [];
  pagedEmployees: any[] = [];
  loading = false;

  currentPage = 1;
  pageSize = 10;
  searchTerm = '';

  selectedEmployee: any = null;

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.loadEmployees();
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
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilter(): void {
    const q = this.searchTerm.toLowerCase().trim();
    this.filteredEmployees = q
      ? this.employees.filter((e) =>
          `${e.firstName} ${e.lastName} ${e.empCode} ${e.designation_name} ${e.department_name}`
            .toLowerCase()
            .includes(q),
        )
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

  manageInsurance(emp: any): void {
    localStorage.setItem('employeeId', JSON.stringify(emp));
    this.selectedEmployee = emp;
  }

  clearSelection(): void {
    this.selectedEmployee = null;
  }

  get totalEmployees(): number {
    return this.employees.length;
  }
}


