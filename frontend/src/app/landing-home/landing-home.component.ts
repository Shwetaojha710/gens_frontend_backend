import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
// import { ChartOptions } from '../dashboard/dashboard.component';
import { DashboardService } from '../services/dashboard.service';
import { MasterService } from '../services/master.service';
import { ViewEncapsulation } from '@angular/core';
@Component({
  selector: 'app-landing-home',
  imports: [CommonModule],
  standalone:true,
  templateUrl: './landing-home.component.html',
  styleUrls: ['./landing-home.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LandingHomeComponent {
  notyf: Notyf = new Notyf();
  // public chartOptions!: Partial<ChartOptions>;
  branchList: any
  obj: any = {};
  stats: any = []
  tenantDetails: any = {}
  branchDt = [
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "X-Y-Z",
      "description": "Central administration and monitoring access."
    },
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "A-B-C",
      "description": "Central administration and monitoring access."
    },
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "D-E-F",
      "description": "Central administration and monitoring access."
    }
  ]
  baseurl: any;
  constructor(private router: Router, public masterService: MasterService) {
    this.baseurl = this.masterService.getBaseUrl();
    this.tenantDetails = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.tenantDetails.image = `${this.baseurl}${this.tenantDetails['image']}`
  }

  goToOnboarding() {

    this.router.navigate(['recruitment/recruitment-dashboard']);

  }
  goToEmployeeManagement() {

    this.router.navigate(['layout/dashboard']);

  }
}
