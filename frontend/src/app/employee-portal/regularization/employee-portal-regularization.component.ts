import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-employee-portal-regularization',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employee-portal-regularization.component.html',
  styleUrl: './employee-portal-regularization.component.css',
})
export class EmployeePortalRegularizationComponent implements OnInit {
  form: FormGroup;
  list: Record<string, unknown>[] = [];
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  loadingList = false;
  submitting = false;

  readonly months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  readonly monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  private notyf = new Notyf();

  constructor(
    private fb: FormBuilder,
    private api: EmployeePortalService,
  ) {
    this.form = this.fb.group({
      attendanceDate: ['', Validators.required],
      inTimeRequested: [''],
      outTimeRequested: [''],
      reason: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    this.loadList();
  }

  /** API allows regularization only for attendance date within the last 2 days. */
  get dateMin(): string {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return toIsoDate(d);
  }

  get dateMax(): string {
    return toIsoDate(new Date());
  }

  loadList(): void {
    this.loadingList = true;
    this.api.getMyRegularizations(this.month, this.year).subscribe({
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
      this.notyf.error('Fill date and reason (min 3 characters).');
      return;
    }
    const v = this.form.getRawValue();
    this.submitting = true;
    this.api
      .createRegularization({
        attendanceDate: v.attendanceDate,
        inTimeRequested: v.inTimeRequested?.trim() || undefined,
        outTimeRequested: v.outTimeRequested?.trim() || undefined,
        reason: v.reason.trim(),
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.notyf.success('Regularization request submitted.');
          this.form.reset({
            attendanceDate: '',
            inTimeRequested: '',
            outTimeRequested: '',
            reason: '',
          });
          this.loadList();
        },
        error: (e: Error) => {
          this.submitting = false;
          this.notyf.error(e.message || 'Could not submit.');
        },
      });
  }

  statusClass(s: unknown): string {
    const x = String(s ?? '').toLowerCase();
    if (x === 'approved') return 'ep-reg-status ep-reg-status--ok';
    if (x === 'rejected') return 'ep-reg-status ep-reg-status--bad';
    return 'ep-reg-status ep-reg-status--warn';
  }

  formatDate(val: unknown): string {
    if (val == null || val === '') return '—';
    const d = new Date(String(val));
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
