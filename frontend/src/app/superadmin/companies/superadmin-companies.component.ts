import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Notyf } from 'notyf';
import { SuperadminService, SubscriptionPayload, TenantStatus } from '../superadmin.service';

type TenantRow = any;
type PlanRow = any;

@Component({
  selector: 'app-superadmin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './superadmin-companies.component.html',
  styleUrl: './superadmin-companies.component.css',
})
export class SuperadminCompaniesComponent implements OnInit {
  notyf = new Notyf();
  loading = false;
  tenants: TenantRow[] = [];
  plans: PlanRow[] = [];

  /** Filter + pagination (client-side; works well into the low thousands) */
  searchQuery = '';
  pageIndex = 0;
  pageSize = 15;

  selectedTenant: TenantRow | null = null;
  subscriptionForm: FormGroup;

  constructor(
    private api: SuperadminService,
    private fb: FormBuilder,
  ) {
    this.subscriptionForm = this.fb.group({
      planId: ['', Validators.required],
      status: ['active', Validators.required],
      startsAt: ['', Validators.required],
      endsAt: ['', Validators.required],
      seats: [null],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.api.listPlans().subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (data.status) this.plans = data.data || [];
      },
    });

    this.api.listTenants().subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Failed to load companies.');
          this.tenants = [];
          return;
        }
        this.tenants = data.data || [];
        this.pageIndex = 0;
      },
      error: () => this.notyf.error('Server error while loading companies.'),
      complete: () => (this.loading = false),
    });
  }

  get filteredTenants(): TenantRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return this.tenants;
    }
    return this.tenants.filter((t) => {
      const name = String(t.companyName || '').toLowerCase();
      const code = String(t.companyCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }

  get pagedTenants(): TenantRow[] {
    const all = this.filteredTenants;
    const start = this.pageIndex * this.pageSize;
    return all.slice(start, start + this.pageSize);
  }

  get totalFiltered(): number {
    return this.filteredTenants.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalFiltered / this.pageSize));
  }

  get rangeStart(): number {
    if (this.totalFiltered === 0) {
      return 0;
    }
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalFiltered);
  }

  get selectedNotInCurrentPage(): boolean {
    if (!this.selectedTenant) {
      return false;
    }
    return !this.pagedTenants.some((t) => t.id === this.selectedTenant!.id);
  }

  onSearchChange(): void {
    this.pageIndex = 0;
  }

  setPageSize(n: number | string): void {
    const v = typeof n === 'number' ? n : Number(n);
    this.pageSize = Number.isFinite(v) && v > 0 ? v : 15;
    this.pageIndex = 0;
  }

  goPrevPage(): void {
    this.pageIndex = Math.max(0, this.pageIndex - 1);
  }

  goNextPage(): void {
    this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
  }

  jumpToSelectedRow(): void {
    if (!this.selectedTenant) {
      return;
    }
    const idx = this.filteredTenants.findIndex((t) => t.id === this.selectedTenant!.id);
    if (idx < 0) {
      return;
    }
    this.pageIndex = Math.floor(idx / this.pageSize);
  }

  setSelected(t: TenantRow) {
    this.selectedTenant = t;
    const ls = t.latestSubscription;
    this.subscriptionForm.reset({
      planId: this.findPlanIdByName(ls?.plan) || '',
      status: ls?.status || 'active',
      startsAt: ls?.startsAt ? this.toDateInput(ls.startsAt) : '',
      endsAt: ls?.endsAt ? this.toDateInput(ls.endsAt) : '',
      seats: ls?.seats ?? null,
      notes: ls?.notes ?? '',
    });
  }

  clearSelected() {
    this.selectedTenant = null;
  }

  toggleTenantStatus(t: TenantRow) {
    const nextStatus: TenantStatus = t.status === 'active' ? 'inactive' : 'active';
    this.api.updateTenantStatus(t.id, nextStatus).subscribe(
      (res): void => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Update failed.');
          return;
        }
        this.notyf.success('Status updated.');
        this.refresh();
      },
      () => this.notyf.error('Server error while updating status.'),
    );
  }

  saveSubscription() {
    if (!this.selectedTenant) {
      this.notyf.error('Select a company first.');
      return;
    }
    if (this.subscriptionForm.invalid) {
      this.subscriptionForm.markAllAsTouched();
      this.notyf.error('Fill required subscription fields.');
      return;
    }

    const v = this.subscriptionForm.value;
    const payload: SubscriptionPayload = {
      planId: v.planId,
      status: v.status,
      startsAt: new Date(v.startsAt).toISOString(),
      endsAt: new Date(v.endsAt).toISOString(),
      seats: v.seats === '' ? null : v.seats,
      notes: v.notes || null,
    };

    this.api.upsertSubscription(this.selectedTenant.id, payload).subscribe(
      (res): void => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Save failed.');
          return;
        }
        this.notyf.success('Subscription saved.');
        this.refresh();
      },
      () => this.notyf.error('Server error while saving subscription.'),
    );
  }

  private toDateInput(value: string): string {
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private findPlanIdByName(name: string | undefined): string | null {
    if (!name) return null;
    const p = this.plans.find((x: any) => String(x?.name || '').toLowerCase() === String(name).toLowerCase());
    return p?.id || null;
  }
}

