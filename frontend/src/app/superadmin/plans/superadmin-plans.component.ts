import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Notyf } from 'notyf';
import { PlanMasterPayload, PlanStatus, SuperadminService } from '../superadmin.service';

type PlanRow = any;

@Component({
  selector: 'app-superadmin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './superadmin-plans.component.html',
  styleUrl: './superadmin-plans.component.css',
})
export class SuperadminPlansComponent implements OnInit {
  notyf = new Notyf();
  loading = false;

  plans: PlanRow[] = [];
  searchQuery = '';
  selectedPlan: PlanRow | null = null;

  get filteredPlans(): PlanRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return this.plans;
    }
    return this.plans.filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const code = String(p.code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }

  form: FormGroup;

  constructor(
    private api: SuperadminService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: [''],
      price: [null],
      billingCycle: ['monthly', Validators.required],
      durationDays: [null],
      maxUsers: [null],
      description: [''],
      status: ['active', Validators.required],
      /** Razorpay Dashboard → Plans → plan_xxx */
      razorpayPlanId: [''],
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
        if (!data.status) {
          this.notyf.error(data.message || 'Failed to load plans.');
          this.plans = [];
          return;
        }
        this.plans = data.data || [];
      },
      error: () => this.notyf.error('Server error while loading plans.'),
      complete: () => (this.loading = false),
    });
  }

  select(p: PlanRow) {
    this.selectedPlan = p;
    const rz =
      p.metadata && typeof p.metadata === 'object' && p.metadata.razorpayPlanId
        ? String(p.metadata.razorpayPlanId)
        : '';
    this.form.reset({
      name: p.name || '',
      code: p.code || '',
      price: p.price ?? null,
      billingCycle: p.billingCycle || 'monthly',
      durationDays: p.durationDays ?? null,
      maxUsers: p.maxUsers ?? null,
      description: p.description || '',
      status: p.status || 'active',
      razorpayPlanId: rz,
    });
  }

  clear() {
    this.selectedPlan = null;
    this.form.reset({
      name: '',
      code: '',
      price: null,
      billingCycle: 'monthly',
      durationDays: null,
      maxUsers: null,
      description: '',
      status: 'active',
      razorpayPlanId: '',
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notyf.error('Please fill required fields.');
      return;
    }

    const v = this.form.getRawValue();
    const rzTrim = (v.razorpayPlanId || '').trim();
    const payload: PlanMasterPayload = {
      name: v.name,
      code: v.code || null,
      description: v.description || null,
      price: v.price === '' || v.price === null ? null : v.price,
      billingCycle: v.billingCycle,
      durationDays: v.durationDays === '' || v.durationDays === null ? null : v.durationDays,
      maxUsers: v.maxUsers === '' || v.maxUsers === null ? null : v.maxUsers,
      status: v.status,
    };

    const meta =
      this.selectedPlan?.metadata && typeof this.selectedPlan.metadata === 'object'
        ? { ...this.selectedPlan.metadata }
        : {};
    if (rzTrim) meta.razorpayPlanId = rzTrim;
    else delete meta.razorpayPlanId;
    payload.metadata = Object.keys(meta).length ? meta : null;

    if (!this.selectedPlan) {
      this.api.createPlan(payload).subscribe({
        next: (res) => {
          const data = JSON.parse(res);
          if (!data.status) {
            this.notyf.error(data.message || 'Create failed.');
            return;
          }
          this.notyf.success('Plan created.');
          this.refresh();
          this.clear();
        },
        error: () => this.notyf.error('Server error while creating plan.'),
      });
      return;
    }

    this.api.updatePlan(this.selectedPlan.id, payload).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Update failed.');
          return;
        }
        this.notyf.success('Plan updated.');
        this.refresh();
      },
      error: () => this.notyf.error('Server error while updating plan.'),
    });
  }

  toggleStatus(p: PlanRow) {
    const next: PlanStatus = p.status === 'active' ? 'inactive' : 'active';
    this.api.updatePlanStatus(p.id, next).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Update failed.');
          return;
        }
        this.notyf.success('Status updated.');
        this.refresh();
      },
      error: () => this.notyf.error('Server error while updating status.'),
    });
  }
}

