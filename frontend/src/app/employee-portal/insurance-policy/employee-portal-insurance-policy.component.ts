import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-insurance-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-portal-insurance-policy.component.html',
  styleUrl: './employee-portal-insurance-policy.component.css',
})
export class EmployeePortalInsurancePolicyComponent implements OnInit {
  loading = true;
  policyUrl: string | null = null;
  private notyf = new Notyf();

  constructor(private portalService: EmployeePortalService) {}

  ngOnInit(): void {
    this.portalService.getAppInsurancePolicy().subscribe({
      next: (res) => {
        this.loading = false;
        this.policyUrl = res?.data?.url || null;
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Could not load insurance policy.');
      },
    });
  }
}
