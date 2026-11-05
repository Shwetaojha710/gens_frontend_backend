import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { ProjectService } from '../../services/project.service';
import { MasterService } from '../../services/master.service';
import {
  BILLING_TYPES,
  PROJECT_STATUSES,
  billingLabel,
  budgetTone,
  fmtHours,
  fmtMoney,
  projectStatusBadge,
  projectStatusLabel,
} from '../project-utils';

/** HR: all projects with budget health; create / edit and assign the project manager. */
@Component({
  selector: 'app-pt-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule],
  templateUrl: './pt-projects.component.html',
})
export class PtProjectsComponent implements OnInit {
  private notyf = new Notyf();

  filters: any = { status: 'active', clientId: null };
  search = '';
  projects: any[] = [];
  clients: any[] = [];
  employeeOptions: any[] = [];
  loading = false;
  saving = false;
  form: any = null;

  readonly statuses = PROJECT_STATUSES;
  readonly billingTypes = BILLING_TYPES;
  readonly fmtHours = fmtHours;
  readonly fmtMoney = fmtMoney;
  readonly budgetTone = budgetTone;
  readonly billingLabel = billingLabel;
  readonly statusLabel = projectStatusLabel;
  readonly statusBadge = projectStatusBadge;

  constructor(private api: ProjectService, private master: MasterService) {}

  ngOnInit(): void {
    this.api.listClients().subscribe((res: any) => (this.clients = res?.data || []));
    this.master.getemployeeList().subscribe((res: any) => {
      this.employeeOptions = res?.status === true ? res.data.filter((o: any) => o.value && o.value !== 'All') : [];
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.listProjects({ status: this.filters.status || null, clientId: this.filters.clientId }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.projects = res?.status === true ? res.data : [];
      },
      error: () => (this.loading = false),
    });
  }

  get filtered(): any[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.projects.filter((p) => [p.name, p.code, p.clientName, p.managerName].some((v) => String(v || '').toLowerCase().includes(q))) : this.projects;
  }

  get activeClients(): any[] {
    return this.clients.filter((c) => c.status === 'active' || c.id === this.form?.clientId);
  }

  open(p?: any): void {
    this.form = p
      ? { ...p }
      : {
          name: '', code: '', clientId: null, description: '', managerId: null, startDate: '', endDate: '',
          status: 'active', billingType: 'time_material', budgetHours: null, budgetAmount: null, defaultBillRate: null, defaultCostRate: null,
        };
  }

  save(): void {
    this.saving = true;
    this.api.saveProject(this.form).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.form = null;
          this.load();
        } else this.notyf.error(res?.message || 'Unable to save');
      },
      error: () => (this.saving = false),
    });
  }
}
