import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { PerformanceService, PmContext } from '../../services/performance.service';
import { MasterService } from '../../services/master.service';
import {
  POTENTIAL_OPTIONS,
  RELATIONSHIP_OPTIONS,
  REVIEW_STATUSES,
  approvalLevelLabel,
  cycleTypeLabel,
  fmtPct,
  fmtRating,
  potentialLabel,
  ratingTone,
  relationshipLabel,
  statusBadge,
} from '../performance-utils';

interface KeyResultForm {
  id?: string;
  title: string;
  unit: string;
  startValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  weightage: number | null;
}

interface GoalForm {
  id?: string;
  type: 'okr' | 'kpi';
  title: string;
  description: string;
  weightage: number | null;
  unit: string;
  targetValue: number | null;
  actualValue: number | null;
  higherIsBetter: boolean;
  keyResults: KeyResultForm[];
}

/**
 * Single appraisal screen used by HR (/layout/performance/review/:id)
 * and the employee portal (/employee-portal/performance/review/:id).
 * What is editable comes from `permissions` returned by the API.
 */
@Component({
  selector: 'app-pm-review-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule],
  templateUrl: './pm-review-detail.component.html',
  styleUrl: './pm-review-detail.component.css',
})
export class PmReviewDetailComponent implements OnInit {
  private notyf = new Notyf();

  ctx: PmContext = 'hr';
  reviewId = '';
  loading = false;
  saving = false;
  detail: any = null;
  perms: any = {};

  goalForm: GoalForm | null = null;
  progressGoalId: string | null = null;
  progressForm: { actualValue: number | null; keyResults: { id: string; title: string; currentValue: number | null }[]; comment: string } | null = null;

  selfForm = { selfRating: null as number | null, selfComments: '' };
  managerForm = { managerRating: null as number | null, potentialRating: null as number | null, managerComments: '' };
  approvalComment = '';

  reviewerOptions: { value: string; label: string }[] = [];
  newReviewers: { reviewerId: string | null; relationship: string }[] = [];

  readonly statuses = REVIEW_STATUSES;
  readonly potentialOptions = POTENTIAL_OPTIONS;
  readonly relationshipOptions = RELATIONSHIP_OPTIONS;
  readonly ratingScale = [1, 2, 3, 4, 5];
  readonly fmtRating = fmtRating;
  readonly fmtPct = fmtPct;
  readonly statusBadge = statusBadge;
  readonly ratingTone = ratingTone;
  readonly potentialLabel = potentialLabel;
  readonly relationshipLabel = relationshipLabel;
  readonly approvalLevelLabel = approvalLevelLabel;
  readonly cycleTypeLabel = cycleTypeLabel;

  constructor(
    private route: ActivatedRoute,
    private api: PerformanceService,
    private master: MasterService,
  ) {}

  ngOnInit(): void {
    this.ctx = (this.route.snapshot.data['pmContext'] as PmContext) || 'hr';
    this.route.paramMap.subscribe((p) => {
      this.reviewId = p.get('id') || '';
      this.load();
    });
  }

  get backLink(): any[] {
    return this.ctx === 'hr' ? ['/layout/performance/reviews'] : ['/employee-portal/performance'];
  }

  get backQuery(): any {
    return this.ctx === 'hr' && this.detail ? { cycleId: this.detail.cycle.id } : {};
  }

  get review(): any { return this.detail?.review; }

  stepDone(i: number): boolean {
    return this.review?.status === 'approved' || i < this.stepIndex;
  }

  get stepIndex(): number {
    return this.statuses.findIndex((s) => s.value === this.review?.status);
  }

  /** Whether the logged-in viewer may edit/delete this particular goal. */
  canTouchGoal(goal: any): boolean {
    if (!this.perms.canEditGoals) return false;
    if (this.ctx === 'hr') return true;
    if (this.perms.viewer === 'manager') return goal.assignedByRole !== 'hr';
    return goal.assignedByRole === 'employee';
  }

  load(): void {
    if (!this.reviewId) return;
    this.loading = true;
    this.api.reviewDetail(this.ctx, this.reviewId).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Unable to load review');
          return;
        }
        this.detail = res.data;
        this.perms = res.data.permissions || {};
        const r = res.data.review;
        this.selfForm = { selfRating: r.selfRating != null ? Number(r.selfRating) : null, selfComments: r.selfComments || '' };
        this.managerForm = {
          managerRating: r.managerRating != null ? Number(r.managerRating) : null,
          potentialRating: r.potentialRating ?? null,
          managerComments: r.managerComments || '',
        };
        if (this.perms.canRequestFeedback && !this.reviewerOptions.length) this.loadReviewerOptions();
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Unable to load review');
      },
    });
  }

  /** Runs an API call, shows the result and reloads the review on success. */
  private act(obs: any, onDone?: () => void): void {
    this.saving = true;
    obs.subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message || 'Saved');
          onDone?.();
          this.load();
        } else {
          this.notyf.error(res?.message || 'Request failed');
        }
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Request failed');
      },
    });
  }

  // ── Goals ──

  openGoal(goal?: any): void {
    this.goalForm = goal
      ? {
          id: goal.id,
          type: goal.type,
          title: goal.title,
          description: goal.description || '',
          weightage: Number(goal.weightage),
          unit: goal.unit || '',
          targetValue: goal.targetValue != null ? Number(goal.targetValue) : null,
          actualValue: goal.actualValue != null ? Number(goal.actualValue) : null,
          higherIsBetter: goal.higherIsBetter !== false,
          keyResults: (goal.keyResults || []).map((k: any) => ({
            id: k.id,
            title: k.title,
            unit: k.unit || '',
            startValue: Number(k.startValue),
            targetValue: Number(k.targetValue),
            currentValue: Number(k.currentValue),
            weightage: Number(k.weightage),
          })),
        }
      : {
          type: 'kpi',
          title: '',
          description: '',
          weightage: null,
          unit: '',
          targetValue: null,
          actualValue: null,
          higherIsBetter: true,
          keyResults: [],
        };
  }

  setGoalType(type: 'okr' | 'kpi'): void {
    if (!this.goalForm) return;
    this.goalForm.type = type;
    if (type === 'okr' && !this.goalForm.keyResults.length) this.addKeyResult();
  }

  addKeyResult(): void {
    this.goalForm?.keyResults.push({ title: '', unit: '', startValue: 0, targetValue: null, currentValue: 0, weightage: 1 });
  }

  removeKeyResult(i: number): void {
    this.goalForm?.keyResults.splice(i, 1);
  }

  saveGoal(): void {
    if (!this.goalForm) return;
    this.act(this.api.saveGoal(this.ctx, this.reviewId, this.goalForm), () => (this.goalForm = null));
  }

  async deleteGoal(goal: any): Promise<void> {
    const ok = await Swal.fire({
      title: 'Delete goal?',
      text: goal.title,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    });
    if (ok.isConfirmed) this.act(this.api.deleteGoal(this.ctx, this.reviewId, goal.id));
  }

  async lockGoals(): Promise<void> {
    const ok = await Swal.fire({
      title: 'Lock goals?',
      text: 'Goal definitions can no longer be changed. Progress can still be updated and self review opens.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Lock goals',
    });
    if (ok.isConfirmed) this.act(this.api.lockGoals(this.ctx, this.reviewId));
  }

  openProgress(goal: any): void {
    this.progressGoalId = goal.id;
    const comment = this.ctx === 'portal' && this.perms.viewer === 'self' ? goal.selfComment : goal.managerComment;
    this.progressForm = {
      actualValue: goal.actualValue != null ? Number(goal.actualValue) : null,
      keyResults: (goal.keyResults || []).map((k: any) => ({ id: k.id, title: k.title, currentValue: Number(k.currentValue) })),
      comment: this.ctx === 'hr' ? '' : comment || '',
    };
  }

  saveProgress(): void {
    if (!this.progressForm || !this.progressGoalId) return;
    const body: any = {
      reviewId: this.reviewId,
      goalId: this.progressGoalId,
      actualValue: this.progressForm.actualValue,
      keyResults: this.progressForm.keyResults.map((k) => ({ id: k.id, currentValue: k.currentValue })),
    };
    if (this.ctx === 'portal') body.comment = this.progressForm.comment;
    this.act(this.api.updateProgress(this.ctx, body), () => {
      this.progressGoalId = null;
      this.progressForm = null;
    });
  }

  // ── Assessments ──

  submitSelf(): void {
    this.act(this.api.submitSelfReview({ reviewId: this.reviewId, ...this.selfForm }));
  }

  async submitManager(): Promise<void> {
    const ok = await Swal.fire({
      title: 'Submit manager review?',
      text: 'The review moves into the approval chain and can no longer be edited unless it is rejected.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Submit',
    });
    if (ok.isConfirmed) this.act(this.api.submitManagerReview({ reviewId: this.reviewId, ...this.managerForm }));
  }

  async skipSelf(): Promise<void> {
    const ok = await Swal.fire({
      title: 'Skip self review?',
      text: 'Use this when the employee missed the self-review deadline. The manager can then complete the review.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Move to manager review',
    });
    if (ok.isConfirmed) this.act(this.api.skipSelfReview(this.reviewId));
  }

  // ── 360 feedback ──

  private loadReviewerOptions(): void {
    const obs = this.ctx === 'hr' ? this.master.getemployeeList() : this.api.colleagues();
    obs.subscribe({
      next: (res: any) => {
        if (res?.status === true && Array.isArray(res.data)) {
          this.reviewerOptions = res.data
            .filter((o: any) => o.value && o.value !== 'All' && o.value !== this.detail?.employee?.id)
            .map((o: any) => ({ value: o.value, label: o.label }));
        }
      },
    });
  }

  addReviewerRow(): void {
    this.newReviewers.push({ reviewerId: null, relationship: 'peer' });
  }

  sendFeedbackRequests(): void {
    const reviewers = this.newReviewers.filter((r) => r.reviewerId);
    if (!reviewers.length) {
      this.notyf.error('Select at least one reviewer');
      return;
    }
    this.act(this.api.requestFeedback(this.ctx, this.reviewId, reviewers), () => (this.newReviewers = []));
  }

  removeFeedback(f: any): void {
    this.act(this.api.removeFeedback(this.reviewId, f.id));
  }

  // ── Approval ──

  decide(action: 'approved' | 'rejected'): void {
    this.act(this.api.approve(this.ctx, this.reviewId, action, this.approvalComment), () => (this.approvalComment = ''));
  }

  barWidth(pct: any): number {
    return Math.min(100, Math.max(0, Number(pct) || 0));
  }
}
