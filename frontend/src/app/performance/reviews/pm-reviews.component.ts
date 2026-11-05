import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { PerformanceService } from '../../services/performance.service';
import { MasterService } from '../../services/master.service';
import { REVIEW_STATUSES, approvalLevelLabel, fmtPct, fmtRating, statusBadge } from '../performance-utils';
import { REVIEW_EXPORT_COLUMNS } from '../performance-export';
import { exportExcel } from '../../shared/utils/table-export';

/** HR: all reviews of a cycle, bulk goal assignment and bulk goal locking. */
@Component({
  selector: 'app-pm-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule],
  templateUrl: './pm-reviews.component.html',
})
export class PmReviewsComponent implements OnInit {
  private notyf = new Notyf();

  cycles: any[] = [];
  cycleId: string | null = null;
  departmentId: string | null = null;
  status = '';
  search = '';
  rows: any[] = [];
  selected = new Set<string>();
  loading = false;
  saving = false;
  departmentOptions: { value: string; label: string }[] = [];
  bulkGoal: any = null;

  readonly statuses = REVIEW_STATUSES;
  readonly fmtPct = fmtPct;
  readonly fmtRating = fmtRating;
  readonly statusBadge = statusBadge;
  readonly approvalLevelLabel = approvalLevelLabel;

  constructor(
    private api: PerformanceService,
    private master: MasterService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.master.Departmentsdd({}).subscribe({
      next: (res: any) => {
        if (res?.status === true && Array.isArray(res.data)) this.departmentOptions = res.data;
      },
    });
    this.api.listCycles().subscribe({
      next: (res: any) => {
        this.cycles = (res?.status === true ? res.data : []).filter((c: any) => c.status !== 'draft');
        const fromQuery = this.route.snapshot.queryParamMap.get('cycleId');
        this.cycleId =
          (fromQuery && this.cycles.some((c) => c.id === fromQuery) ? fromQuery : null) ||
          this.cycles.find((c) => c.status === 'active')?.id ||
          this.cycles[0]?.id ||
          null;
        this.load();
      },
    });
  }

  get cycle(): any {
    return this.cycles.find((c) => c.id === this.cycleId);
  }

  get filtered(): any[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter((r) =>
      [r.employeeName, r.empCode, r.department, r.managerName].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }

  get selectableIds(): string[] {
    return this.filtered.filter((r) => r.status === 'goal_setting').map((r) => r.reviewId);
  }

  load(): void {
    if (!this.cycleId) return;
    this.loading = true;
    this.selected.clear();
    this.router.navigate([], { queryParams: { cycleId: this.cycleId }, replaceUrl: true });
    this.api.listReviews({ cycleId: this.cycleId, departmentId: this.departmentId, status: this.status || null }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.rows = res?.status === true ? res.data : [];
        if (res?.status !== true) this.notyf.error(res?.message || 'Unable to load reviews');
      },
      error: () => (this.loading = false),
    });
  }

  toggle(id: string, checked: boolean): void {
    checked ? this.selected.add(id) : this.selected.delete(id);
  }

  toggleAll(checked: boolean): void {
    this.selected = new Set(checked ? this.selectableIds : []);
  }

  lockSelected(): void {
    this.saving = true;
    this.api.lockGoalsBulk([...this.selected]).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          const skipped = res.data?.skipped || [];
          if (skipped.length) {
            const names = skipped
              .slice(0, 5)
              .map((s: any) => `${this.rows.find((r) => r.reviewId === s.reviewId)?.employeeName}: ${s.reason}`)
              .join('\n');
            this.notyf.error({ message: names, duration: 8000 });
          }
          this.load();
        } else this.notyf.error(res?.message || 'Failed');
      },
      error: () => (this.saving = false),
    });
  }

  openBulkGoal(): void {
    this.bulkGoal = {
      departmentId: this.departmentId,
      goal: { type: 'kpi', title: '', description: '', weightage: null, unit: '', targetValue: null, higherIsBetter: true, keyResults: [] },
    };
  }

  addKr(): void {
    this.bulkGoal.goal.keyResults.push({ title: '', unit: '', startValue: 0, targetValue: null, weightage: 1 });
  }

  saveBulkGoal(): void {
    this.saving = true;
    this.api.bulkAssignGoal({ cycleId: this.cycleId, departmentId: this.bulkGoal.departmentId, goal: this.bulkGoal.goal }).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.bulkGoal = null;
          this.load();
        } else this.notyf.error(res?.message || 'Failed');
      },
      error: () => (this.saving = false),
    });
  }

  exportExcel(): void {
    exportExcel(`Performance_Reviews_${this.cycle?.name || ''}`, [
      { name: 'Reviews', columns: REVIEW_EXPORT_COLUMNS, rows: this.filtered },
    ]);
  }
}
