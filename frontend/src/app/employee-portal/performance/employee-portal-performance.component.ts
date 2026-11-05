import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { PerformanceService } from '../../services/performance.service';
import { PmNineBoxComponent } from '../../performance/nine-box/pm-nine-box.component';
import { cycleTypeLabel, fmtPct, fmtRating, relationshipLabel, statusBadge } from '../../performance/performance-utils';

type Tab = 'mine' | 'feedback' | 'team' | 'approvals';

/** Employee portal hub: own reviews, 360 requests, team reviews (managers) and skip-level approvals. */
@Component({
  selector: 'app-employee-portal-performance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PmNineBoxComponent],
  templateUrl: './employee-portal-performance.component.html',
  styleUrl: './employee-portal-performance.component.css',
})
export class EmployeePortalPerformanceComponent implements OnInit {
  private notyf = new Notyf();

  tab: Tab = 'mine';
  loading = { mine: false, feedback: false, team: false, approvals: false };

  myReviews: any[] = [];
  feedbackTasks: any[] = [];
  team: { rows: any[]; summary: any } = { rows: [], summary: null };
  approvals: any[] = [];

  /** Feedback currently being filled in. */
  feedbackForm: { id: string; competencyRatings: Record<string, number>; strengths: string; improvements: string } | null = null;
  submitting = false;

  readonly ratingScale = [1, 2, 3, 4, 5];
  readonly fmtPct = fmtPct;
  readonly fmtRating = fmtRating;
  readonly statusBadge = statusBadge;
  readonly cycleTypeLabel = cycleTypeLabel;
  readonly relationshipLabel = relationshipLabel;

  constructor(private api: PerformanceService, private router: Router) {}

  ngOnInit(): void {
    this.loadMine();
    this.loadFeedback();
    this.loadTeam();
    this.loadApprovals();
  }

  get activeReviews(): any[] {
    return this.myReviews.filter((r) => r.cycleStatus === 'active');
  }

  get pastReviews(): any[] {
    return this.myReviews.filter((r) => r.cycleStatus !== 'active');
  }

  get pendingFeedbackCount(): number {
    return this.feedbackTasks.filter((t) => t.status === 'pending').length;
  }

  /** Short next-step hint for an employee's own review. */
  nextStep(r: any): string {
    switch (r.status) {
      case 'goal_setting': return 'Add your goals; your manager will lock them.';
      case 'self_review': return 'Update progress and submit your self review.';
      case 'manager_review': return 'Waiting for your manager’s review.';
      case 'in_approval': return 'Waiting for final approval.';
      case 'approved': return 'Review complete.';
      default: return '';
    }
  }

  private fetch(key: keyof EmployeePortalPerformanceComponent['loading'], obs: any, assign: (data: any) => void): void {
    this.loading[key] = true;
    obs.subscribe({
      next: (res: any) => {
        this.loading[key] = false;
        if (res?.status === true) assign(res.data);
      },
      error: () => (this.loading[key] = false),
    });
  }

  loadMine(): void { this.fetch('mine', this.api.myReviews(), (d) => (this.myReviews = d || [])); }
  loadFeedback(): void { this.fetch('feedback', this.api.myFeedbackTasks(), (d) => (this.feedbackTasks = d || [])); }
  loadTeam(): void { this.fetch('team', this.api.teamReviews(), (d) => (this.team = d || { rows: [], summary: null })); }
  loadApprovals(): void { this.fetch('approvals', this.api.pendingApprovals(), (d) => (this.approvals = d || [])); }

  open(reviewId: string): void {
    this.router.navigate(['/employee-portal/performance/review', reviewId]);
  }

  startFeedback(t: any): void {
    this.feedbackForm = {
      id: t.id,
      competencyRatings: Object.fromEntries(t.competencies.map((c: string) => [c, 0])),
      strengths: '',
      improvements: '',
    };
  }

  submitFeedback(): void {
    if (!this.feedbackForm) return;
    this.submitting = true;
    this.api.submitFeedback({ feedbackId: this.feedbackForm.id, ...this.feedbackForm }).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.feedbackForm = null;
          this.loadFeedback();
        } else this.notyf.error(res?.message || 'Unable to submit');
      },
      error: () => {
        this.submitting = false;
        this.notyf.error('Unable to submit');
      },
    });
  }
}
