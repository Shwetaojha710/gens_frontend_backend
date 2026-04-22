import { Component } from '@angular/core';
// import { PayrollService } from '../../../../../src_21_1_2026/app/services/payroll.service';
import { StatusService } from '../../../services/status.service';
import { DataService } from '../../../services/data.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { Notyf } from 'notyf';
import { PayrollService } from '../../../services/payroll.service';
@Component({
  selector: 'app-service-agreement',
  imports: [DatePipe, CommonModule, FormsModule],
  templateUrl: './service-agreement.component.html',
  styleUrl: './service-agreement.component.css'
})
export class ServiceAgreementComponent {
    notyf: Notyf;
 agreementDate = '01 Jan 2026';
  companyName = 'Quaere Tech Pvt Ltd';
  employeeName = 'John Doe';
tenant:any={}
personalDetails:any={}
minDate:any
currency:any

  constructor(
    public payrollService: PayrollService, private router: Router, public statusService: StatusService, public dataService: DataService
  ) {

    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

    const today = new Date();
    this.minDate = today.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.currency = JSON.parse(localStorage.getItem('currency') || '{}');

  }

  salary = {
    basic: 15000,
    hra: 5000,
    total: 20000
  };
getTitle(): string {
  return this.personalDetails?.gender === 'Male' ? 'Mr.' : 'Ms.';
}

getRelation(): string {
  return this.personalDetails?.gender === 'Male' ? 'S/O' : 'D/O';
}
  formatJoiningDate(dateStr: string): string {
  const date = new Date(dateStr);

  const day = date.getDate();
  const year = date.getFullYear();

  const month = date.toLocaleString('default', { month: 'long' });

  const suffix = this.getDaySuffix(day);

  return `Joining ${day}${suffix} Day of ${month}, ${year}`;
}

getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';

  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
}
