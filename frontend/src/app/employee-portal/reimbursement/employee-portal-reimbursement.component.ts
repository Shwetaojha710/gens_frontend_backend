import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-employee-portal-reimbursement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employee-portal-reimbursement.component.html',
  styleUrl: './employee-portal-reimbursement.component.css',
})
export class EmployeePortalReimbursementComponent implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  form: FormGroup;
  list: Record<string, unknown>[] = [];
  teamList: Record<string, unknown>[] = [];
  selectedFiles: File[] = [];
  loadingList = false;
  loadingTeam = false;
  submitting = false;
  updatingId: string | null = null;

  // Role flags
  isSeniorAccountant = false;
  isManagerOrDirector = false;
  get isApprover(): boolean { return this.isSeniorAccountant || this.isManagerOrDirector; }

  // Status filters
  teamStatusFilter = 'all';
  myStatusFilter = 'all';

  readonly teamStatuses = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  readonly myStatuses = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  get filteredList(): Record<string, unknown>[] {
    if (this.myStatusFilter === 'all') return this.list;
    return this.list.filter(r => String(r['status'] ?? '').toLowerCase() === this.myStatusFilter);
  }

  private notyf = new Notyf();

  constructor(
    private fb: FormBuilder,
    private api: EmployeePortalService,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    this.form = this.fb.group({
      fromDate: [today, Validators.required],
      toDate: [today, Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      remark: ['', [Validators.required, Validators.minLength(2)]],
    });

    try {
      const raw = localStorage.getItem('empPortalUser');
      if (raw) {
        const u = JSON.parse(raw) as { role?: string; designation?: string };
        const role = (u.role || '').toLowerCase();
        const designation = (u.designation || '').toLowerCase().trim();
        this.isSeniorAccountant = designation === 'senior accountant';
        this.isManagerOrDirector = role === 'manager' || role === 'director' || role === 'teamleader';
      }
    } catch {
      this.isSeniorAccountant = false;
      this.isManagerOrDirector = false;
    }
  }

  ngOnInit(): void {
    this.loadList();
    if (this.isApprover) {
      this.loadTeamList();
    }
  }

  get minToDate(): string {
    const f = this.form.get('fromDate')?.value as string;
    return f || '';
  }

  onFilesChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = input.files;
    this.selectedFiles = files ? Array.from(files) : [];
  }

  clearFiles(): void {
    this.selectedFiles = [];
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  loadList(): void {
    this.loadingList = true;
    this.api.getReimbursementList().subscribe({
      next: (rows) => {
        this.list = rows;
        this.loadingList = false;
      },
      error: () => {
        this.list = [];
        this.loadingList = false;
      },
    });
  }

  loadTeamList(): void {
    this.loadingTeam = true;
    this.api.getTeamReimbursements(this.teamStatusFilter).subscribe({
      next: (rows) => {
        this.teamList = rows;
        this.loadingTeam = false;
      },
      error: () => {
        this.teamList = [];
        this.loadingTeam = false;
      },
    });
  }

  setTeamFilter(status: string): void {
    this.teamStatusFilter = status;
    this.loadTeamList();
  }

  recommend(id: string): void {
    this.updatingId = id;
    this.api.updateAppReimbursementStatus(id, 'recommended').subscribe({
      next: () => {
        this.updatingId = null;
        this.notyf.success('Reimbursement recommended.');
        this.loadTeamList();
      },
      error: (e: Error) => {
        this.updatingId = null;
        this.notyf.error(e.message || 'Action failed.');
      },
    });
  }

  approveOrReject(id: string, status: 'approved' | 'rejected'): void {
    this.updatingId = id;
    this.api.updateAppReimbursementStatus(id, status).subscribe({
      next: () => {
        this.updatingId = null;
        this.notyf.success(`Reimbursement ${status}.`);
        this.loadTeamList();
      },
      error: (e: Error) => {
        this.updatingId = null;
        this.notyf.error(e.message || 'Action failed.');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notyf.error('Fill all fields with valid values.');
      return;
    }
    if (this.selectedFiles.length === 0) {
      this.notyf.error('Attach at least one bill / receipt (image or PDF).');
      return;
    }
    const v = this.form.getRawValue();
    if (v.toDate < v.fromDate) {
      this.notyf.error('To date must be on or after from date.');
      return;
    }

    const fd = new FormData();
    fd.append('fromDate', v.fromDate);
    fd.append('toDate', v.toDate);
    fd.append('amount', String(v.amount));
    fd.append('remark', String(v.remark).trim());
    for (const f of this.selectedFiles) {
      fd.append('images', f, f.name);
    }

    this.submitting = true;
    this.api.addAppReimbursement(fd).subscribe({
      next: () => {
        this.submitting = false;
        this.notyf.success('Reimbursement submitted.');
        const t = new Date().toISOString().slice(0, 10);
        this.form.reset({ fromDate: t, toDate: t, amount: '', remark: '' });
        this.clearFiles();
        this.loadList();
        if (this.isApprover) this.loadTeamList();
      },
      error: (e: Error) => {
        this.submitting = false;
        this.notyf.error(e.message || 'Submit failed.');
      },
    });
  }

  statusClass(s: unknown): string {
    const x = String(s ?? '').toLowerCase();
    if (x === 'approved' || x === 'paid') return 'ep-reim-status ep-reim-status--ok';
    if (x === 'rejected') return 'ep-reim-status ep-reim-status--bad';
    if (x === 'recommended') return 'ep-reim-status ep-reim-status--recommended';
    return 'ep-reim-status ep-reim-status--warn';
  }

  formatDate(val: unknown): string {
    if (val == null || val === '') return '—';
    const d = new Date(String(val));
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  fileList(row: Record<string, unknown>): { image?: string; doc_type?: string }[] {
    const f = row['files'];
    if (!Array.isArray(f)) return [];
    return f as { image?: string; doc_type?: string }[];
  }

  imageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const serverRoot = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${serverRoot}/${path.replace(/^\//, '')}`;
  }
}
