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
  selectedFiles: File[] = [];
  loadingList = false;
  submitting = false;

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
  }

  ngOnInit(): void {
    this.loadList();
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
    // Strip trailing /api/ (or /api) to get the server root, then join with the path
    const serverRoot = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${serverRoot}/${path.replace(/^\//, '')}`;
  }
}
