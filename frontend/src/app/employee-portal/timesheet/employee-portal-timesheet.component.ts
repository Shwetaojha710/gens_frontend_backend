import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { ProjectService } from '../../services/project.service';
import { PtTimesheetViewComponent } from '../../project/timesheet-view/pt-timesheet-view.component';
import {
  addDays,
  budgetTone,
  fmtHours,
  projectStatusBadge,
  projectStatusLabel,
  timesheetBadge,
  timesheetStatusLabel,
} from '../../project/project-utils';

type Tab = 'week' | 'projects' | 'approvals';

interface GridRow {
  key: string;
  projectId: string;
  taskId: string | null;
  isBillable: boolean;
  label: string;
  /** date -> entries in that cell */
  cells: Record<string, any[]>;
}

/**
 * Employee portal: weekly / daily timesheet with a timer, my projects
 * (project managers manage them from here) and timesheet approvals for
 * reporting managers.
 */
@Component({
  selector: 'app-employee-portal-timesheet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PtTimesheetViewComponent],
  templateUrl: './employee-portal-timesheet.component.html',
  styleUrl: './employee-portal-timesheet.component.css',
})
export class EmployeePortalTimesheetComponent implements OnInit, OnDestroy {
  private notyf = new Notyf();
  private tick: any = null;

  tab: Tab = 'week';
  view: 'grid' | 'day' = 'grid';
  week: any = null;
  loading = false;
  busy = false;

  rows: GridRow[] = [];
  newRow = { projectId: null as string | null, taskId: null as string | null, isBillable: true };
  /** Draft cell values typed by the user, keyed `${rowKey}|${date}`. */
  cellDraft: Record<string, number | null> = {};

  selectedDay = '';
  dayForm: any = null;

  timerForm = { projectId: null as string | null, taskId: null as string | null, notes: '', isBillable: true };
  elapsed = '';

  projects: any[] = [];
  approvals: any[] = [];
  openId: string | null = null;
  approvalDetail: any = null;
  canAct = false;

  readonly fmtHours = fmtHours;
  readonly badge = timesheetBadge;
  readonly statusLabel = timesheetStatusLabel;
  readonly projectStatusBadge = projectStatusBadge;
  readonly projectStatusLabel = projectStatusLabel;
  readonly budgetTone = budgetTone;

  constructor(private api: ProjectService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (t) this.tab = t;
    this.loadWeek();
    this.loadProjects();
    this.loadApprovals();
    this.tick = setInterval(() => this.updateElapsed(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.tick);
  }

  // ── Loading ──

  loadWeek(weekStart?: string): void {
    this.loading = true;
    this.api.week(weekStart || this.week?.weekStart).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Unable to load week');
          return;
        }
        this.week = res.data;
        if (!this.week.days.includes(this.selectedDay)) {
          this.selectedDay = this.week.days.includes(this.week.today) ? this.week.today : this.week.days[0];
        }
        this.buildRows();
        this.updateElapsed();
      },
      error: () => (this.loading = false),
    });
  }

  loadProjects(): void {
    this.api.myProjects().subscribe((res: any) => (this.projects = res?.data || []));
  }

  loadApprovals(): void {
    this.api.approvals().subscribe((res: any) => (this.approvals = res?.data || []));
  }

  shiftWeek(days: number): void {
    this.loadWeek(addDays(this.week.weekStart, days));
  }

  thisWeek(): void {
    this.loadWeek(this.week.today);
  }

  // ── Helpers ──

  project(id: string | null): any {
    return this.week?.assignable.find((p: any) => p.projectId === id);
  }

  tasksOf(projectId: string | null): any[] {
    return this.project(projectId)?.tasks || [];
  }

  /** Billable is only offered when both the project/member and the task allow it. */
  canBill(projectId: string | null, taskId: string | null): boolean {
    const p = this.project(projectId);
    if (!p?.billable) return false;
    const t = p.tasks.find((x: any) => x.id === taskId);
    return !t || t.billable !== false;
  }

  recFor(date: string): any {
    return this.week?.reconciliation?.find((r: any) => r.date === date);
  }

  dayTotal(date: string): number {
    return (this.week?.entries || []).filter((e: any) => e.date === date).reduce((s: number, e: any) => s + e.hours, 0);
  }

  isFuture(date: string): boolean {
    return date > this.week.today;
  }

  // ── Week grid ──

  private rowKey(projectId: string, taskId: string | null, billable: boolean): string {
    return `${projectId}|${taskId || ''}|${billable}`;
  }

  buildRows(): void {
    const keep = this.rows.filter((r) => !Object.values(r.cells).some((c) => c.length)); // empty rows the user added
    const byKey: Record<string, GridRow> = {};
    for (const e of this.week.entries) {
      const key = this.rowKey(e.projectId, e.taskId, e.isBillable);
      byKey[key] = byKey[key] || {
        key,
        projectId: e.projectId,
        taskId: e.taskId,
        isBillable: e.isBillable,
        label: e.projectName + (e.taskTitle ? ` · ${e.taskTitle}` : ''),
        cells: {},
      };
      (byKey[key].cells[e.date] = byKey[key].cells[e.date] || []).push(e);
    }
    for (const r of keep) if (!byKey[r.key] && this.project(r.projectId)) byKey[r.key] = { ...r, cells: {} };
    this.rows = Object.values(byKey);
    this.cellDraft = {};
  }

  cellValue(row: GridRow, date: string): number | null {
    const k = `${row.key}|${date}`;
    if (k in this.cellDraft) return this.cellDraft[k];
    const sum = (row.cells[date] || []).reduce((s, e) => s + e.hours, 0);
    return sum || null;
  }

  /** A cell is editable inline only when it holds at most one manual entry. */
  cellLocked(row: GridRow, date: string): boolean {
    const entries = row.cells[date] || [];
    return !this.week.editable || this.isFuture(date) || entries.length > 1 || entries.some((e) => e.running);
  }

  rowTotal(row: GridRow): number {
    return Object.values(row.cells).flat().reduce((s, e: any) => s + e.hours, 0);
  }

  addRow(): void {
    const { projectId, taskId } = this.newRow;
    if (!projectId) return;
    const billable = this.newRow.isBillable && this.canBill(projectId, taskId);
    const key = this.rowKey(projectId, taskId, billable);
    if (this.rows.some((r) => r.key === key)) {
      this.notyf.error('That row is already in the grid');
      return;
    }
    const p = this.project(projectId);
    const t = p.tasks.find((x: any) => x.id === taskId);
    this.rows.push({ key, projectId, taskId, isBillable: billable, label: p.name + (t ? ` · ${t.title}` : ''), cells: {} });
    this.newRow = { projectId: null, taskId: null, isBillable: true };
  }

  saveCell(row: GridRow, date: string, raw: any): void {
    const value = raw === '' || raw === null ? 0 : Number(raw);
    const existing = (row.cells[date] || [])[0];
    const current = existing ? existing.hours : 0;
    delete this.cellDraft[`${row.key}|${date}`];
    if (Number.isNaN(value) || value === current) return;

    const done = (res: any) => {
      this.busy = false;
      if (res?.status !== true) this.notyf.error(res?.message || 'Unable to save');
      this.loadWeek();
    };
    this.busy = true;
    if (existing && value === 0) {
      this.api.deleteEntry(existing.id).subscribe({ next: done, error: () => (this.busy = false) });
    } else if (value > 0) {
      this.api
        .saveEntry({
          id: existing?.id,
          projectId: row.projectId,
          taskId: row.taskId,
          date,
          hours: value,
          isBillable: row.isBillable,
          notes: existing?.notes,
        })
        .subscribe({ next: done, error: () => (this.busy = false) });
    } else {
      this.busy = false;
    }
  }

  // ── Day view ──

  get dayEntries(): any[] {
    return (this.week?.entries || []).filter((e: any) => e.date === this.selectedDay);
  }

  openDayForm(entry?: any): void {
    this.dayForm = entry
      ? { id: entry.id, projectId: entry.projectId, taskId: entry.taskId, hours: entry.hours, notes: entry.notes || '', isBillable: entry.isBillable }
      : { projectId: this.week.assignable[0]?.projectId || null, taskId: null, hours: null, notes: '', isBillable: true };
  }

  saveDayForm(): void {
    const f = this.dayForm;
    this.busy = true;
    this.api.saveEntry({ ...f, date: this.selectedDay, isBillable: f.isBillable && this.canBill(f.projectId, f.taskId) }).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.dayForm = null;
          this.loadWeek();
        } else this.notyf.error(res?.message || 'Unable to save');
      },
      error: () => (this.busy = false),
    });
  }

  deleteEntry(e: any): void {
    this.busy = true;
    this.api.deleteEntry(e.id).subscribe({
      next: (res: any) => {
        this.busy = false;
        res?.status === true ? this.notyf.success(res.message) : this.notyf.error(res?.message || 'Unable to delete');
        this.loadWeek();
      },
      error: () => (this.busy = false),
    });
  }

  // ── Timer ──

  private updateElapsed(): void {
    const started = this.week?.timer?.startedAt;
    if (!started) {
      this.elapsed = '';
      return;
    }
    const secs = Math.max(0, Math.floor((Date.now() - new Date(started).getTime()) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    this.elapsed = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
  }

  timerLabel(): string {
    const t = this.week?.timer;
    if (!t) return '';
    const p = this.project(t.projectId);
    const task = p?.tasks.find((x: any) => x.id === t.taskId);
    return (p?.name || 'Project') + (task ? ` · ${task.title}` : '');
  }

  startTimer(): void {
    const f = this.timerForm;
    this.busy = true;
    this.api.startTimer({ ...f, isBillable: f.isBillable && this.canBill(f.projectId, f.taskId) }).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.timerForm = { projectId: null, taskId: null, notes: '', isBillable: true };
          this.loadWeek(this.week.today);
        } else this.notyf.error(res?.message || 'Unable to start timer');
      },
      error: () => (this.busy = false),
    });
  }

  stopTimer(): void {
    this.busy = true;
    this.api.stopTimer().subscribe({
      next: (res: any) => {
        this.busy = false;
        res?.status === true ? this.notyf.success(res.message) : this.notyf.error(res?.message || 'Unable to stop timer');
        this.loadWeek();
      },
      error: () => (this.busy = false),
    });
  }

  // ── Submit ──

  async submit(): Promise<void> {
    const flags = (this.week.reconciliation || []).reduce((s: number, r: any) => s + r.flags.length, 0);
    const ok = await Swal.fire({
      title: 'Submit this week?',
      html: `${fmtHours(this.week.timesheet.totalHours)} logged.` + (flags ? `<br><small>${flags} day(s) don't match your attendance — your manager will see this.</small>` : ''),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Submit',
    });
    if (!ok.isConfirmed) return;
    this.busy = true;
    this.api.submitWeek(this.week.weekStart).subscribe({
      next: (res: any) => {
        this.busy = false;
        res?.status === true ? this.notyf.success(res.message) : this.notyf.error(res?.message || 'Unable to submit');
        this.loadWeek();
      },
      error: () => (this.busy = false),
    });
  }

  // ── Approvals ──

  openApproval(id: string): void {
    this.openId = id;
    this.approvalDetail = null;
    this.api.timesheetDetail('portal', id).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Unable to load timesheet');
        this.openId = null;
        return;
      }
      this.approvalDetail = res.data;
      this.canAct = !!res.data.permissions?.canAct;
    });
  }

  onDecide(d: { action: 'approved' | 'rejected'; comments: string }): void {
    const id = this.openId!;
    this.busy = true;
    this.api.actOnTimesheet('portal', id, d.action, d.comments).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.openId = null;
          this.loadApprovals();
        } else this.notyf.error(res?.message || 'Request failed');
      },
      error: () => (this.busy = false),
    });
  }
}
