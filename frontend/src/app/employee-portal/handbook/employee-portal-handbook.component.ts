import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-handbook',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-portal-handbook.component.html',
  styleUrl: './employee-portal-handbook.component.css',
})
export class EmployeePortalHandbookComponent implements OnInit {
  loading = true;
  handbookUrl: string | null = null;
  private notyf = new Notyf();

  constructor(private portalService: EmployeePortalService) {}

  ngOnInit(): void {
    this.portalService.getAppHandbook().subscribe({
      next: (res) => {
        this.loading = false;
        this.handbookUrl = res?.data?.url || null;
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Could not load handbook.');
      },
    });
  }
}
