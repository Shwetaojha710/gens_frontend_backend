import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';

/** Match API logic in AppapplyForLeave (moment diff + half-day adjustments). */
function calcLeaveDays(
  fromIso: string,
  toIso: string,
  durationType: string,
  toDurationType: string,
): number {
  if (!fromIso || !toIso) return 0;
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  if (Number.isNaN(+from) || Number.isNaN(+to) || to < from) return 0;
  const msDay = 86400000;
  let days = Math.round((+to - +from) / msDay) + 1;
  if (fromIso === toIso) {
    return durationType === 'full' ? 1 : 0.5;
  }
  if (durationType === 'first_half' || durationType === 'second_half') days -= 0.5;
  if (toDurationType === 'first_half' || toDurationType === 'second_half') days -= 0.5;
  return Math.max(0, days);
}

@Component({
  selector: 'app-employee-portal-leave',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './employee-portal-leave.component.html',
  styleUrl: './employee-portal-leave.component.css',
})
export class EmployeePortalLeaveComponent implements OnInit {
  /** Short month labels for the period selector. */
  readonly monthShort = [
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

  types: { value: string; label: string; allowedPerYear?: number }[] = [];
  /** Full list from API (self + team rows when the user is a lead/manager). */
  leavesAll: unknown[] = [];
  /** Which slice of {@link leavesAll} the table shows. */
  listTab: 'my' | 'team' = 'my';
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  loading = false;
  pageSize = 5;
  currentPage = 1;
  searchQuery = '';
  readonly pageSizeOptions = [5, 10, 25, 50];
  submitting = false;
  decliningId: string | null = null;
  recommendingId: string | null = null;
  approvingId: string | null = null;
  decliningTeamId: string | null = null;
  branches: any = [];
  selectedBranchId = '';

  form: FormGroup;

  private notyf = new Notyf();
  private empId = '';
  userDesignation = '';

  constructor(
    private fb: FormBuilder,
    private api: EmployeePortalService,
  ) {
    this.form = this.fb.group(
      {
        leaveTypeId: ['', Validators.required],
        fromDate: ['', Validators.required],
        toDate: ['', Validators.required],
        duration_type: ['full', Validators.required],
        to_duration_type: ['full', Validators.required],
        reason: ['', Validators.required],
      },
      { validators: [this.buildLeaveDatesValidator()] },
    );
  }

  private buildLeaveDatesValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const fg = group as FormGroup;
      const from = fg.get('fromDate')?.value as string;
      const to = fg.get('toDate')?.value as string;
      const today = this.minDateStr;
      if (from && from < today) return { fromInPast: true };
      if (from && to && to < from) return { toBeforeFrom: true };
      return null;
    };
  }

  ngOnInit(): void {
    try {
      const u = JSON.parse(localStorage.getItem('empPortalUser') || '{}');
      this.empId = u.id || '';
      this.userDesignation = String(u.role || '').toLowerCase().trim();
    } catch {
      this.empId = '';
    }

    this.api.getLeaveTypes().subscribe({
      next: (t) => (this.types = t || []),
      error: (e: Error) => this.notyf.error(e.message || 'Could not load leave types'),
    });

    console.log(this.isDirectorOrManager);


    if (this.isDirectorOrManager) {
      this.api.getBranches().subscribe({
        next: (b) => (this.branches = b),
        error: () => {},
      });
      console.log(this.branches,"branches");

    }

    this.loadList();

    this.form.get('fromDate')?.valueChanges.subscribe(() => {
      this.clampToAfterFrom();
      this.syncHalfDayWhenSingle();
      this.form.updateValueAndValidity({ emitEvent: false });
    });
    this.form.get('toDate')?.valueChanges.subscribe(() => {
      this.syncHalfDayWhenSingle();
      this.form.updateValueAndValidity({ emitEvent: false });
    });
    this.form.get('duration_type')?.valueChanges.subscribe(() => this.syncHalfDayWhenSingle());
  }

  /** Today YYYY-MM-DD (local). */
  get minDateStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  get minToDateStr(): string {
    const from = this.form.get('fromDate')?.value as string;
    if (from && from >= this.minDateStr) return from;
    return this.minDateStr;
  }

  get isSingleLeaveDay(): boolean {
    const f = this.form.get('fromDate')?.value as string;
    const t = this.form.get('toDate')?.value as string;
    return !!f && !!t && f === t;
  }

  get computedLeaveDays(): number {
    return calcLeaveDays(
      String(this.form.get('fromDate')?.value || ''),
      String(this.form.get('toDate')?.value || ''),
      String(this.form.get('duration_type')?.value || 'full'),
      String(this.form.get('to_duration_type')?.value || 'full'),
    );
  }

  get computedLeaveDaysLabel(): string {
    const d = this.computedLeaveDays;
    if (!this.form.get('fromDate')?.value || !this.form.get('toDate')?.value) return '—';
    if (d <= 0) return '—';
    if (d === 0.5) return '0.5 day';
    if (d === 1) return '1 day';
    return `${d} days`;
  }

  get isTeamLead(): boolean {
    console.log(this.userDesignation,"user designaiton");

    return this.userDesignation.includes('teamleader') || this.userDesignation.includes('teamleader');
  }

  get isApprover(): boolean {
    return this.userDesignation.includes('director') || this.userDesignation.includes('manager');
  }

  get isDirectorOrManager(): boolean {
    return this.userDesignation.includes('director') || this.userDesignation.includes('manager');
  }

  /** Restricted leave: unused balance expires at calendar year-end (no carry-forward). */
  get restrictedLeaveYearEndHint(): boolean {
    const id = this.form.get('leaveTypeId')?.value;
    if (id == null || id === '') return false;
    const t = this.types.find((x) => String(x.value) === String(id));
    const label = String(t?.label ?? '').toLowerCase();
    return label.includes('restricted');
  }

  private clampToAfterFrom(): void {
    const from = this.form.get('fromDate')?.value as string;
    const to = this.form.get('toDate')?.value as string;
    if (from && to && to < from) {
      this.form.patchValue({ toDate: from }, { emitEvent: true });
    }
  }

  /** Single calendar day: API uses duration_type for the 0.5 vs 1 rule; keep both in sync. */
  private syncHalfDayWhenSingle(): void {
    const f = this.form.get('fromDate')?.value as string;
    const t = this.form.get('toDate')?.value as string;
    if (f && t && f === t) {
      const d = this.form.get('duration_type')?.value;
      const cur = this.form.get('to_duration_type')?.value;
      if (d !== cur) {
        this.form.patchValue({ to_duration_type: d }, { emitEvent: false });
      }
    }
  }

  /** Rows for the active tab, filtered by search query. */
  get displayLeaves(): unknown[] {
    if (!this.empId) return [];
    const isMine = (row: unknown) =>
      String((row as Record<string, unknown>)['employeeId']) === this.empId;
    const tabFiltered = this.listTab === 'my'
      ? this.leavesAll.filter(isMine)
      : this.leavesAll.filter((r) => !isMine(r));
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter((row) => {
      const r = row as Record<string, unknown>;
      const name = String(r['employeeName'] ?? '').toLowerCase();
      return name.includes(q);
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.displayLeaves.length / this.pageSize));
  }

  get pagedLeaves(): unknown[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.displayLeaves.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.displayLeaves.length);
  }

  applicantName(row: unknown): string {
    const n = (row as Record<string, unknown>)['employeeName'];
    if (n != null && String(n).trim()) return String(n).trim();
    return '—';
  }

  applicantInitials(row: unknown): string {
    const name = this.applicantName(row);
    if (name === '—') return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  /** Semantic pill class for approval workflow status. */
  leaveStatusClass(status: unknown): string {
    const raw = String(status ?? '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
    if (raw === 'approved') return 'ep-status ep-status--ok';
    if (raw === 'pending' || raw === 'recommended') return 'ep-status ep-status--warn';
    if (raw === 'rejected' || raw === 'self_declined') return 'ep-status ep-status--bad';
    if (raw === 'cancelled' || raw === 'canceled') return 'ep-status ep-status--muted';
    return 'ep-status ep-status--neutral';
  }

  selfDecline(row: unknown): void {
    const r = row as Record<string, unknown>;
    const id = String(r['id'] ?? '');
    if (!id) return;
    this.decliningId = id;
    this.api.selfDeclineLeave(id).subscribe({
      next: () => {
        this.decliningId = null;
        this.notyf.success('Leave declined successfully.');
        this.loadList();
      },
      error: (e: Error) => {
        this.decliningId = null;
        this.notyf.error(e.message || 'Could not decline leave.');
      },
    });
  }

  recommendLeave(row: unknown): void {
    console.log(row,"::row");

    const r = row as Record<string, unknown>;
    const id = String(r['id'] ?? '');
    if (!id) return;
    this.recommendingId = id;
    this.api.recommendLeave(id).subscribe({
      next: () => {
        this.recommendingId = null;
        this.notyf.success('Leave recommended successfully.');
        this.loadList();
      },
      error: (e: Error) => {
        this.recommendingId = null;
        this.notyf.error(e.message || 'Could not recommend leave.');
      },
    });
  }

  approveLeave(row: unknown): void {
    const r = row as Record<string, unknown>;
    const id = String(r['id'] ?? '');
    if (!id) return;
    this.approvingId = id;
    this.api.approveLeave(id).subscribe({
      next: () => {
        this.approvingId = null;
        this.notyf.success('Leave approved successfully.');
        this.loadList();
      },
      error: (e: Error) => {
        this.approvingId = null;
        this.notyf.error(e.message || 'Could not approve leave.');
      },
    });
  }

  declineLeave(row: unknown): void {
    const r = row as Record<string, unknown>;
    const id = String(r['id'] ?? '');
    if (!id) return;
    this.decliningTeamId = id;
    this.api.declineLeave(id).subscribe({
      next: () => {
        this.decliningTeamId = null;
        this.notyf.success('Leave declined successfully.');
        this.loadList();
      },
      error: (e: Error) => {
        this.decliningTeamId = null;
        this.notyf.error(e.message || 'Could not decline leave.');
      },
    });
  }

  /** Stable row key for *ngFor. */
  trackLeaveRow(index: number, row: unknown): string {
    const r = row as Record<string, unknown>;
    const id = r['id'];
    if (id != null && String(id) !== '') return String(id);
    const k = [r['employeeId'], r['fromDate'], r['toDate'], r['appliedOn']].join('-');
    if (k !== '---') return k;
    return `leave-row-${index}`;
  }

  setListTab(tab: 'my' | 'team'): void {
    this.listTab = tab;
    this.currentPage = 1;
    this.searchQuery = '';
  }

  onBranchChange(): void {
    this.currentPage = 1;
    this.loadList();
  }

  loadList(): void {
    this.loading = true;
    this.api.getAppliedLeaves(this.month, this.year, this.selectedBranchId || undefined).subscribe({
      next: (res) => {
        this.loading = false;
        const data = res['data'];
        if (res['status'] === true && Array.isArray(data)) this.leavesAll = data;
        else this.leavesAll = [];
        this.currentPage = 1;
      },
      error: () => {
        this.loading = false;
        this.leavesAll = [];
      },
    });
  }

  submit(): void {
    this.form.updateValueAndValidity();
    if (this.form.invalid || !this.empId) {
      this.form.markAllAsTouched();
      if (this.form.errors?.['fromInPast']) {
        this.notyf.error('You cannot apply leave for past dates.');
      } else if (this.form.errors?.['toBeforeFrom']) {
        this.notyf.error('To date must be on or after from date.');
      } else {
        this.notyf.error('Fill all fields.');
      }
      return;
    }
    const v = this.form.getRawValue();
    this.submitting = true;
    this.api
      .applyLeave({
        employeeId: this.empId,
        leaveTypeId: v.leaveTypeId!,
        fromDate: v.fromDate!,
        toDate: v.toDate!,
        reason: v.reason!,
        duration_type: v.duration_type,
        to_duration_type: v.to_duration_type,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.notyf.success('Leave submitted.');
          this.form.reset({
            leaveTypeId: '',
            fromDate: '',
            toDate: '',
            duration_type: 'full',
            to_duration_type: 'full',
            reason: '',
          });
          this.loadList();
        },
        error: (e: Error) => {
          this.submitting = false;
          this.notyf.error(e.message || 'Submit failed');
        },
      });
  }
}
