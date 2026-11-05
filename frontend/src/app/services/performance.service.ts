import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Which API family a shared screen talks to: HR panel or employee portal. */
export type PmContext = 'hr' | 'portal';

/**
 * Performance management API.
 * HR endpoints use the admin token; `my/*` endpoints use the employee-portal
 * token (the auth interceptor picks the right one).
 */
@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private readonly base = `${environment.apiUrl}performance/`;

  constructor(private http: HttpClient) {}

  private post(path: string, body: any = {}): Observable<any> {
    return this.http.post(`${this.base}${path}`, body);
  }

  // ── HR: cycles ──
  listCycles(): Observable<any> { return this.post('cycle/list'); }
  saveCycle(data: any): Observable<any> { return this.post('cycle/save', data); }
  deleteCycle(cycleId: string): Observable<any> { return this.post('cycle/delete', { cycleId }); }
  launchCycle(cycleId: string): Observable<any> { return this.post('cycle/launch', { cycleId }); }
  closeCycle(cycleId: string): Observable<any> { return this.post('cycle/close', { cycleId }); }

  // ── HR: reviews & analytics ──
  listReviews(filters: any): Observable<any> { return this.post('review/list', filters); }
  lockGoalsBulk(reviewIds: string[]): Observable<any> { return this.post('review/lock-goals', { reviewIds }); }
  bulkAssignGoal(data: any): Observable<any> { return this.post('goal/bulk-assign', data); }
  skipSelfReview(reviewId: string): Observable<any> { return this.post('review/skip-self', { reviewId }); }
  removeFeedback(reviewId: string, feedbackId: string): Observable<any> {
    return this.post('feedback/remove', { reviewId, feedbackId });
  }
  dashboard(filters: any): Observable<any> { return this.post('dashboard', filters); }
  report(filters: any): Observable<any> { return this.post('report', filters); }
  employeeHistory(employeeId: string): Observable<any> { return this.post('history', { employeeId }); }

  // ── Portal only ──
  myReviews(): Observable<any> { return this.post('my/reviews'); }
  submitSelfReview(data: any): Observable<any> { return this.post('my/self-review', data); }
  submitManagerReview(data: any): Observable<any> { return this.post('my/manager-review', data); }
  myFeedbackTasks(): Observable<any> { return this.post('my/feedback/tasks'); }
  submitFeedback(data: any): Observable<any> { return this.post('my/feedback/submit', data); }
  teamReviews(cycleId?: string): Observable<any> { return this.post('my/team', cycleId ? { cycleId } : {}); }
  pendingApprovals(): Observable<any> { return this.post('my/approvals'); }
  colleagues(): Observable<any> { return this.post('my/colleagues'); }

  // ── Shared review screen (endpoint depends on context) ──
  reviewDetail(ctx: PmContext, reviewId: string): Observable<any> {
    return this.post(ctx === 'hr' ? 'review/detail' : 'my/review-detail', { reviewId });
  }
  saveGoal(ctx: PmContext, reviewId: string, goal: any): Observable<any> {
    return this.post(ctx === 'hr' ? 'goal/save' : 'my/goal/save', { reviewId, goal });
  }
  deleteGoal(ctx: PmContext, reviewId: string, goalId: string): Observable<any> {
    return this.post(ctx === 'hr' ? 'goal/delete' : 'my/goal/delete', { reviewId, goalId });
  }
  updateProgress(ctx: PmContext, data: any): Observable<any> {
    return this.post(ctx === 'hr' ? 'goal/progress' : 'my/goal/progress', data);
  }
  lockGoals(ctx: PmContext, reviewId: string): Observable<any> {
    return ctx === 'hr' ? this.lockGoalsBulk([reviewId]) : this.post('my/lock-goals', { reviewId });
  }
  requestFeedback(ctx: PmContext, reviewId: string, reviewers: any[]): Observable<any> {
    return this.post(ctx === 'hr' ? 'feedback/request' : 'my/feedback/request', { reviewId, reviewers });
  }
  approve(ctx: PmContext, reviewId: string, action: 'approved' | 'rejected', comments: string): Observable<any> {
    return this.post(ctx === 'hr' ? 'review/approve' : 'my/approve', { reviewId, action, comments });
  }
}
