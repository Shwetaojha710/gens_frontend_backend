import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EmployeePortalService } from '../services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './employee-portal-profile.component.html',
  styleUrl: './employee-portal-profile.component.css',
})
export class EmployeePortalProfileComponent implements OnInit {
  loading = true;
  profile: Record<string, unknown> | null = null;

  constructor(private api: EmployeePortalService) {}

  ngOnInit(): void {
    this.api.getEmpDetails().subscribe({
      next: (data) => {
        this.profile = data as Record<string, unknown>;
        this.loading = false;
      },
      error: () => {
        this.profile = null;
        this.loading = false;
      },
    });
  }

  line(key: string): string {
    const v = this.profile?.[key];
    if (v == null || v === '') return '—';
    return String(v);
  }
}
