import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { ProjectService, PtContext } from '../../services/project.service';
import { MasterService } from '../../services/master.service';
import {
  TASK_STATUSES,
  billingLabel,
  budgetTone,
  fmtHours,
  fmtMoney,
  projectStatusBadge,
  projectStatusLabel,
  taskStatusLabel,
} from '../project-utils';

type Tab = 'tasks' | 'team';

/**
 * Project overview, tasks and team. Used by HR (/layout/project/projects/:id)
 * and by employees in the portal (/employee-portal/projects/:id); the API
 * decides what the viewer may change (permissions.canManage / canSeeMoney).
 */
@Component({
  selector: 'app-pt-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule, NgApexchartsModule],
  templateUrl: './pt-project-detail.component.html',
})
export class PtProjectDetailComponent implements OnInit {
  private notyf = new Notyf();

  ctx: PtContext = 'hr';
  id = '';
  tab: Tab = 'tasks';
  range = { from: '', to: '', approvedOnly: false };
  detail: any = null;
  perms: any = {};
  loading = false;
  saving = false;
  weeklyChart: any = null;

  taskForm: any = null;
  memberForm: any = null;
  employeeOptions: { value: string; label: string }[] = [];

  readonly taskStatuses = TASK_STATUSES;
  readonly fmtHours = fmtHours;
  readonly fmtMoney = fmtMoney;
  readonly budgetTone = budgetTone;
  readonly billingLabel = billingLabel;
  readonly statusLabel = projectStatusLabel;
  readonly statusBadge = projectStatusBadge;
  readonly taskStatusLabel = taskStatusLabel;

  constructor(
    private route: ActivatedRoute,
    private api: ProjectService,
    private master: MasterService,
  ) {}

  ngOnInit(): void {
    this.ctx = (this.route.snapshot.data['ptContext'] as PtContext) || 'hr';
    this.route.paramMap.subscribe((p) => {
      this.id = p.get('id') || '';
      this.load();
    });
  }

  get backLink(): any[] {
    return this.ctx === 'hr' ? ['/layout/project/projects'] : ['/employee-portal/timesheet'];
  }

  get backQuery(): any {
    return this.ctx === 'hr' ? {} : { tab: 'projects' };
  }

  get project(): any { return this.detail?.project; }
  get figures(): any { return this.detail?.figures || {}; }

  /** Top-level tasks, for the "parent" picker. */
  get parentOptions(): any[] {
    return (this.detail?.tasks || []).filter((t: any) => !this.taskForm || t.id !== this.taskForm.id);
  }

  get activeMembers(): any[] {
    return (this.detail?.members || []).filter((m: any) => m.status === 'active');
  }

  load(): void {
    if (!this.id) return;
    this.loading = true;
    const range: any = { approvedOnly: this.range.approvedOnly };
    if (this.range.from) range.from = this.range.from;
    if (this.range.to) range.to = this.range.to;
    this.api.projectDetail(this.ctx, this.id, range).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Unable to load project');
          return;
        }
        this.detail = res.data;
        this.perms = res.data.permissions || {};
        this.weeklyChart = res.data.weekly.length
          ? {
              series: [{ name: 'Hours', data: res.data.weekly.map((w: any) => w.hours) }],
              chart: { type: 'bar', height: 220, toolbar: { show: false } },
              xaxis: { categories: res.data.weekly.map((w: any) => w.weekStart) },
              dataLabels: { enabled: false },
              plotOptions: { bar: { borderRadius: 3 } },
            }
          : null;
        if (this.perms.canManage && !this.employeeOptions.length) this.loadEmployees();
      },
      error: () => (this.loading = false),
    });
  }

  private loadEmployees(): void {
    const obs = this.ctx === 'hr' ? this.master.getemployeeList() : this.api.colleagues();
    obs.subscribe((res: any) => {
      if (res?.status === true) this.employeeOptions = res.data.filter((o: any) => o.value && o.value !== 'All');
    });
  }

  variance(t: any): number | null {
    const est = t.estimatedHours;
    const actual = t.subtasks ? t.rolledActual : t.actualHours;
    return est ? actual - est : null;
  }

  private run(obs: any, after: () => void): void {
    this.saving = true;
    obs.subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          after();
          this.load();
        } else this.notyf.error(res?.message || 'Request failed');
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Request failed');
      },
    });
  }

  // ── Tasks ──
  openTask(task?: any, parentId?: string): void {
    this.taskForm = task
      ? { ...task }
      : { title: '', description: '', parentId: parentId || null, assigneeId: null, estimatedHours: null, dueDate: '', status: 'todo', isBillable: true };
  }

  saveTask(): void {
    this.run(this.api.saveTask(this.ctx, { ...this.taskForm, projectId: this.id }), () => (this.taskForm = null));
  }

  setTaskStatus(task: any, status: string): void {
    this.run(this.api.saveTask(this.ctx, { ...task, status, projectId: this.id }), () => {});
  }

  async deleteTask(task: any): Promise<void> {
    const ok = await Swal.fire({ title: `Delete "${task.title}"?`, text: 'Its subtasks are deleted too.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' });
    if (ok.isConfirmed) this.run(this.api.deleteTask(this.ctx, this.id, task.id), () => {});
  }

  // ── Team ──
  openMember(m?: any): void {
    this.memberForm = m
      ? { ...m }
      : { employeeId: null, role: '', allocationPercent: 100, startDate: '', endDate: '', isBillable: true, billRate: null, costRate: null };
  }

  saveMember(): void {
    this.run(this.api.saveAllocation(this.ctx, { ...this.memberForm, projectId: this.id }), () => (this.memberForm = null));
  }

  async removeMember(m: any): Promise<void> {
    const ok = await Swal.fire({
      title: `Remove ${m.employeeName}?`,
      text: 'Hours already logged are kept; they just cannot log new time here.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
    });
    if (ok.isConfirmed) this.run(this.api.removeAllocation(this.ctx, this.id, m.id), () => {});
  }
}
