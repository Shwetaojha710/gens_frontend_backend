import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

type UserRow = any;
type TenantRow = any;

@Component({
  selector: 'app-superadmin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './superadmin-users.component.html',
  styleUrl: './superadmin-users.component.css',
})
export class SuperadminUsersComponent implements OnInit {
  notyf = new Notyf();
  loading = false;

  users: UserRow[] = [];
  companies: TenantRow[] = [];

  selected: UserRow | null = null;
  editForm: FormGroup;
  pwForm: FormGroup;
  pwVisible = false;
  pwLoading = false;

  filterForm: FormGroup;

  constructor(
    private api: SuperadminService,
    private fb: FormBuilder,
  ) {
    this.filterForm = this.fb.group({
      tenantId: [''],
      status: [''],
      role: [''],
      q: [''],
    });

    this.editForm = this.fb.group({
      name: [''],
      role: ['employee'],
      status: ['active'],
    });

    this.pwForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    this.loadCompanies();
    this.search();
  }

  loadCompanies() {
    this.api.listTenants().subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (data.status) this.companies = data.data || [];
      },
    });
  }

  search() {
    this.loading = true;
    const v = this.filterForm.value;
    this.api.listUsers({
      tenantId: v.tenantId || undefined,
      status: v.status || undefined,
      role: v.role || undefined,
      q: v.q || undefined,
    }).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Failed to load users.');
          this.users = [];
          return;
        }
        this.users = data.data || [];
      },
      error: () => this.notyf.error('Server error while loading users.'),
      complete: () => (this.loading = false),
    });
  }

  clearFilters() {
    this.filterForm.reset({ tenantId: '', status: '', role: '', q: '' });
    this.search();
  }

  select(u: UserRow) {
    this.selected = u;
    this.editForm.reset({
      name: u.name || '',
      role: u.role || 'employee',
      status: u.status || 'active',
    });
  }

  clearSelected() {
    this.selected = null;
    this.pwForm.reset();
    this.pwVisible = false;
  }

  quickToggleStatus(u: UserRow) {
    const next = u.status === 'active' ? 'inactive' : 'active';
    this.api.updateUser(u.id, { status: next }).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Update failed.');
          return;
        }
        this.notyf.success('User status updated.');
        this.search();
      },
      error: () => this.notyf.error('Server error while updating user.'),
    });
  }

  save() {
    if (!this.selected) return;
    const v = this.editForm.value;
    this.api.updateUser(this.selected.id, {
      name: v.name,
      role: v.role,
      status: v.status,
    }).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Update failed.');
          return;
        }
        this.notyf.success('User updated.');
        this.search();
      },
      error: () => this.notyf.error('Server error while updating user.'),
    });
  }

  updatePassword() {
    if (!this.selected || this.pwForm.invalid) {
      this.pwForm.markAllAsTouched();
      return;
    }
    this.pwLoading = true;
    this.api.updateUser(this.selected.id, { newPassword: this.pwForm.value.newPassword }).subscribe({
      next: (res) => {
        this.pwLoading = false;
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Password update failed.');
          return;
        }
        this.notyf.success('Password updated successfully.');
        this.pwForm.reset();
        this.pwVisible = false;
      },
      error: () => {
        this.pwLoading = false;
        this.notyf.error('Server error while updating password.');
      },
    });
  }
}

