import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

interface SaTenantDetails {
  id?: string;
  companyName?: string;
  companyCode?: string;
  status?: string;
  companyAddress?: string;
  logo?: string | null;
  logoDark?: string | null;
  adminEmail?: string;
}

/** Same rules as the company registration form. */
const COMPANY_NAME_RE = /^[a-zA-Z0-9\s.\-&']+$/;
const ADMIN_EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const LOGO_MAX_SIZE = 2 * 1024 * 1024; // 2MB

@Component({
  selector: 'app-superadmin-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './superadmin-company-dashboard.component.html',
  styleUrl: './superadmin-company-dashboard.component.css',
})
export class SuperadminCompanyDashboardComponent implements OnInit, OnDestroy {
  notyf = new Notyf();
  loading = true;
  tenantId = '';
  snapshot: {
    tenant?: SaTenantDetails;
    counts?: { employeesActive?: number; employeesTotal?: number };
    branches?: { id: string; name: string; status?: string }[];
    employees?: any[];
    leaves?: any[];
    attendance?: any[];
    holidays?: any[];
  } | null = null;

  /** null = all branches (only when multiple branches exist) */
  selectedBranchId: string | null = null;

  readonly pageSizeOptions = [5, 10, 15, 25];

  empSearch = '';
  empPage = 0;
  empPageSize = 10;

  leaveSearch = '';
  leavePage = 0;
  leavePageSize = 10;

  attSearch = '';
  attPage = 0;
  attPageSize = 10;

  holSearch = '';
  holPage = 0;
  holPageSize = 10;

  /* ----- Edit company ----- */
  editOpen = false;
  editSaving = false;
  editSubmitted = false;
  editForm = { companyName: '', companyAddress: '', adminEmail: '' };
  editLogoFile: File | null = null;
  editLogoPreview: string | null = null;
  editRemoveLogo = false;
  editLogoDarkFile: File | null = null;
  editLogoDarkPreview: string | null = null;
  editRemoveLogoDark = false;

  /** When the hero <img> fails, fall back to initials. */
  private heroLogoBroken = false;

  /**
   * Park edit dialog on document.body so sticky tables / sa-content overflow
   * cannot paint through or over the modal.
   */
  @ViewChild('editBackdrop')
  set editBackdrop(ref: ElementRef<HTMLElement> | undefined) {
    const el = ref?.nativeElement;
    if (el && el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: SuperadminService,
  ) {}

  /** Prefer light logo (white chip on blue); else dark logo. */
  get heroLogoSrc(): string | null {
    if (this.heroLogoBroken) return null;
    const t = this.snapshot?.tenant;
    if (!t) return null;
    return t.logo || t.logoDark || null;
  }

  onHeroLogoError(): void {
    this.heroLogoBroken = true;
  }

  companyInitials(name?: string | null): string {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => {
      // Route param is defined as `companies/:companyId/dashboard`
      const id = pm.get('companyId') || '';
      this.tenantId = id;
      if (!id) {
        this.router.navigate(['/superadmin/companies']);
        return;
      }
      this.load(id);
    });
  }

  private resetTableUi(): void {
    this.empSearch = '';
    this.empPage = 0;
    this.empPageSize = 10;
    this.leaveSearch = '';
    this.leavePage = 0;
    this.leavePageSize = 10;
    this.attSearch = '';
    this.attPage = 0;
    this.attPageSize = 10;
    this.holSearch = '';
    this.holPage = 0;
    this.holPageSize = 10;
    this.selectedBranchId = null;
  }

  load(tenantId: string): void {
    this.loading = true;
    this.snapshot = null;
    this.heroLogoBroken = false;
    this.api.getTenantCompanySnapshot(tenantId).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Could not load company dashboard.');
          this.router.navigate(['/superadmin/companies']);
          return;
        }
        this.snapshot = data.data || {};
        this.heroLogoBroken = false;
        this.resetTableUi();
      },
      error: () => {
        this.notyf.error('Server error loading dashboard.');
        this.router.navigate(['/superadmin/companies']);
      },
      complete: () => (this.loading = false),
    });
  }

  backToCompanies(): void {
    this.router.navigate(['/superadmin/companies']);
  }

  openEdit(): void {
    const t = this.snapshot?.tenant;
    if (!t) return;
    this.editForm = {
      companyName: t.companyName || '',
      companyAddress: t.companyAddress || '',
      adminEmail: t.adminEmail || '',
    };
    this.editLogoFile = null;
    this.editLogoPreview = null;
    this.editRemoveLogo = false;
    this.editLogoDarkFile = null;
    this.editLogoDarkPreview = null;
    this.editRemoveLogoDark = false;
    this.editSubmitted = false;
    this.editOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeEdit(): void {
    if (this.editSaving) return;
    this.editOpen = false;
    document.body.style.overflow = '';
  }

  get editNameError(): string | null {
    const v = this.editForm.companyName.trim();
    if (!v) return 'Company name is required.';
    if (v.length > 60) return 'Company name cannot exceed 60 characters.';
    if (!COMPANY_NAME_RE.test(v)) return "Special characters are not allowed. Only letters, numbers, spaces, . - & ' are permitted.";
    return null;
  }

  get editEmailError(): string | null {
    const v = this.editForm.adminEmail.trim();
    if (!this.snapshot?.tenant?.adminEmail && !v) return null; // no admin user to update
    if (!v) return 'Email is required.';
    if (!ADMIN_EMAIL_RE.test(v)) return 'Enter a valid email address.';
    return null;
  }

  get editAddressError(): string | null {
    return this.editForm.companyAddress.trim().length > 500 ? 'Address cannot exceed 500 characters.' : null;
  }

  /** Logo shown in the edit dialog: new pick, else current (unless removed). */
  get editLogoShown(): string | null {
    if (this.editLogoPreview) return this.editLogoPreview;
    if (this.editRemoveLogo) return null;
    return this.snapshot?.tenant?.logo || null;
  }

  get editLogoDarkShown(): string | null {
    if (this.editLogoDarkPreview) return this.editLogoDarkPreview;
    if (this.editRemoveLogoDark) return null;
    return this.snapshot?.tenant?.logoDark || null;
  }

  onEditLogoChange(event: Event, variant: 'light' | 'dark' = 'light'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      this.notyf.error('Only JPG, JPEG, and PNG formats are allowed.');
      input.value = '';
      return;
    }
    if (file.size > LOGO_MAX_SIZE) {
      this.notyf.error('Maximum allowed file size is 2MB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    if (variant === 'dark') {
      this.editLogoDarkFile = file;
      this.editRemoveLogoDark = false;
      reader.onload = () => (this.editLogoDarkPreview = reader.result as string);
    } else {
      this.editLogoFile = file;
      this.editRemoveLogo = false;
      reader.onload = () => (this.editLogoPreview = reader.result as string);
    }
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeEditLogo(variant: 'light' | 'dark' = 'light'): void {
    if (variant === 'dark') {
      this.editLogoDarkFile = null;
      this.editLogoDarkPreview = null;
      this.editRemoveLogoDark = true;
      return;
    }
    this.editLogoFile = null;
    this.editLogoPreview = null;
    this.editRemoveLogo = true;
  }

  saveEdit(): void {
    this.editSubmitted = true;
    if (this.editNameError || this.editEmailError || this.editAddressError) return;

    const fd = new FormData();
    fd.append('companyName', this.editForm.companyName.trim());
    fd.append('companyAddress', this.editForm.companyAddress.trim());
    if (this.editForm.adminEmail.trim()) fd.append('adminEmail', this.editForm.adminEmail.trim());
    if (this.editLogoFile) fd.append('logo', this.editLogoFile, this.editLogoFile.name);
    else if (this.editRemoveLogo) fd.append('removeLogo', 'true');
    if (this.editLogoDarkFile) fd.append('logoDark', this.editLogoDarkFile, this.editLogoDarkFile.name);
    else if (this.editRemoveLogoDark) fd.append('removeLogoDark', 'true');

    this.editSaving = true;
    this.api.updateTenantDetails(this.tenantId, fd).subscribe({
      next: (res) => {
        this.editSaving = false;
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Could not update company.');
          return;
        }
        if (this.snapshot) this.snapshot.tenant = { ...this.snapshot.tenant, ...(data.data || {}) };
        this.closeEdit();
        this.notyf.success(data.message || 'Company details updated.');
      },
      error: (err) => {
        this.editSaving = false;
        let msg = 'Server error. Please try again.';
        try {
          msg = JSON.parse(err?.error)?.message || msg;
        } catch {}
        this.notyf.error(msg);
      },
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  get branchesList(): { id: string; name: string; status?: string }[] {
    return this.snapshot?.branches ?? [];
  }

  /** Single-branch tenants always filter to that branch; otherwise use selectedBranchId (null = all). */
  get effectiveBranchFilter(): string | null {
    const list = this.branchesList;
    if (list.length === 1) return list[0].id;
    const id = this.selectedBranchId;
    if (id == null || String(id).trim() === '') return null;
    return id;
  }

  private rowMatchesBranch(row: { branchId?: string | null }): boolean {
    const want = this.effectiveBranchFilter;
    if (!want) return true;
    if (row.branchId === want) return true;
    const list = this.branchesList;
    const unassigned = row.branchId == null || row.branchId === '';
    if (unassigned && list.length === 1 && list[0].id === want) return true;
    return false;
  }

  branchOnChange(): void {
    this.empPage = 0;
    this.leavePage = 0;
    this.attPage = 0;
    this.holPage = 0;
  }

  /* ----- Employees ----- */
  get empSource(): any[] {
    const all = this.snapshot?.employees ?? [];
    return all.filter((e) => this.rowMatchesBranch(e));
  }

  get empFiltered(): any[] {
    const q = this.empSearch.trim().toLowerCase();
    if (!q) return this.empSource;
    return this.empSource.filter((e) => {
      const name = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
      const email = String(e.email || '').toLowerCase();
      const code = String(e.empCode || '').toLowerCase();
      const st = String(e.status || '').toLowerCase();
      const br = String(e.branchName || '').toLowerCase();
      return (
        name.includes(q) || email.includes(q) || code.includes(q) || st.includes(q) || br.includes(q)
      );
    });
  }

  get empPaged(): any[] {
    const start = this.empPage * this.empPageSize;
    return this.empFiltered.slice(start, start + this.empPageSize);
  }

  get empTotalPages(): number {
    return Math.max(1, Math.ceil(this.empFiltered.length / this.empPageSize));
  }

  get empRangeStart(): number {
    if (this.empFiltered.length === 0) return 0;
    return this.empPage * this.empPageSize + 1;
  }

  get empRangeEnd(): number {
    return Math.min((this.empPage + 1) * this.empPageSize, this.empFiltered.length);
  }

  empOnSearch(): void {
    this.empPage = 0;
  }

  empOnPageSize(): void {
    this.empPage = 0;
  }

  empPrev(): void {
    this.empPage = Math.max(0, this.empPage - 1);
  }

  empNext(): void {
    this.empPage = Math.min(this.empTotalPages - 1, this.empPage + 1);
  }

  empClearSearch(): void {
    this.empSearch = '';
    this.empOnSearch();
  }

  /* ----- Leave ----- */
  get leaveSource(): any[] {
    const all = this.snapshot?.leaves ?? [];
    return all.filter((l) => this.rowMatchesBranch(l));
  }

  get leaveFiltered(): any[] {
    const q = this.leaveSearch.trim().toLowerCase();
    if (!q) return this.leaveSource;
    return this.leaveSource.filter((l) => {
      const blob = [
        l.employeeName,
        l.status,
        l.fromDate,
        l.toDate,
        String(l.days),
        l.branchName,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }

  get leavePaged(): any[] {
    const start = this.leavePage * this.leavePageSize;
    return this.leaveFiltered.slice(start, start + this.leavePageSize);
  }

  get leaveTotalPages(): number {
    return Math.max(1, Math.ceil(this.leaveFiltered.length / this.leavePageSize));
  }

  get leaveRangeStart(): number {
    if (this.leaveFiltered.length === 0) return 0;
    return this.leavePage * this.leavePageSize + 1;
  }

  get leaveRangeEnd(): number {
    return Math.min((this.leavePage + 1) * this.leavePageSize, this.leaveFiltered.length);
  }

  leaveOnSearch(): void {
    this.leavePage = 0;
  }

  leaveOnPageSize(): void {
    this.leavePage = 0;
  }

  leavePrev(): void {
    this.leavePage = Math.max(0, this.leavePage - 1);
  }

  leaveNext(): void {
    this.leavePage = Math.min(this.leaveTotalPages - 1, this.leavePage + 1);
  }

  leaveClearSearch(): void {
    this.leaveSearch = '';
    this.leaveOnSearch();
  }

  /* ----- Attendance ----- */
  get attSource(): any[] {
    const all = this.snapshot?.attendance ?? [];
    return all.filter((a) => this.rowMatchesBranch(a));
  }

  get attFiltered(): any[] {
    const q = this.attSearch.trim().toLowerCase();
    if (!q) return this.attSource;
    return this.attSource.filter((a) => {
      const blob = [
        a.employeeName,
        a.date,
        a.check_in_time,
        a.check_out_time,
        a.branchName,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }

  get attPaged(): any[] {
    const start = this.attPage * this.attPageSize;
    return this.attFiltered.slice(start, start + this.attPageSize);
  }

  get attTotalPages(): number {
    return Math.max(1, Math.ceil(this.attFiltered.length / this.attPageSize));
  }

  get attRangeStart(): number {
    if (this.attFiltered.length === 0) return 0;
    return this.attPage * this.attPageSize + 1;
  }

  get attRangeEnd(): number {
    return Math.min((this.attPage + 1) * this.attPageSize, this.attFiltered.length);
  }

  attOnSearch(): void {
    this.attPage = 0;
  }

  attOnPageSize(): void {
    this.attPage = 0;
  }

  attPrev(): void {
    this.attPage = Math.max(0, this.attPage - 1);
  }

  attNext(): void {
    this.attPage = Math.min(this.attTotalPages - 1, this.attPage + 1);
  }

  attClearSearch(): void {
    this.attSearch = '';
    this.attOnSearch();
  }

  /* ----- Holidays ----- */
  get holSource(): any[] {
    const all = this.snapshot?.holidays ?? [];
    return all.filter((h) => this.rowMatchesBranch(h));
  }

  get holFiltered(): any[] {
    const q = this.holSearch.trim().toLowerCase();
    if (!q) return this.holSource;
    return this.holSource.filter((h) => {
      const blob = [h.holiday_name, h.holiday_type, h.date, h.branchName].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }

  get holPaged(): any[] {
    const start = this.holPage * this.holPageSize;
    return this.holFiltered.slice(start, start + this.holPageSize);
  }

  get holTotalPages(): number {
    return Math.max(1, Math.ceil(this.holFiltered.length / this.holPageSize));
  }

  get holRangeStart(): number {
    if (this.holFiltered.length === 0) return 0;
    return this.holPage * this.holPageSize + 1;
  }

  get holRangeEnd(): number {
    return Math.min((this.holPage + 1) * this.holPageSize, this.holFiltered.length);
  }

  holOnSearch(): void {
    this.holPage = 0;
  }

  holOnPageSize(): void {
    this.holPage = 0;
  }

  holPrev(): void {
    this.holPage = Math.max(0, this.holPage - 1);
  }

  holNext(): void {
    this.holPage = Math.min(this.holTotalPages - 1, this.holPage + 1);
  }

  holClearSearch(): void {
    this.holSearch = '';
    this.holOnSearch();
  }

  leaveStatusClass(status: string | undefined): string {
    const s = (status || '').toLowerCase().replace(/\s+/g, '_');
    if (s === 'approved') return 'sa-pill sa-pill--success';
    if (s === 'rejected' || s === 'self_declined') return 'sa-pill sa-pill--danger';
    if (s === 'pending' || s === 'recommended' || s === 'escalate') return 'sa-pill sa-pill--warn';
    return 'sa-pill sa-pill--muted';
  }

  empStatusClass(status: string | undefined): string {
    return (status || '').toLowerCase() === 'active' ? 'sa-pill sa-pill--success' : 'sa-pill sa-pill--muted';
  }

  tenantStatusClass(status: string | undefined): string {
    return (status || '').toLowerCase() === 'active' ? 'sa-pill sa-pill--live' : 'sa-pill sa-pill--inactive';
  }
}
