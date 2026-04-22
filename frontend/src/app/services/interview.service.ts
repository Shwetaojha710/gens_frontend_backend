import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  InterviewFeedbackPayload,
  InterviewPanelUser,
  InterviewRoundPlan,
  InterviewSchedulePayload
} from '../recruitment/recruitment.models';

export interface InterviewerAssignedInterview {
  round_id: string;
  round_master_id: string;
  application_id: string;
  round_name: string;
  round_type: string;
  sequence: number;
  total_rounds: number;
  scheduled_at: string;
  duration_minutes: number;
  mode: string;
  meeting_link: string;
  status: string;
  feedback_submitted: boolean;
  is_unlocked: boolean;
  recommendation?: string | null;
  rating?: number | null;
  strengths?: string | null;
  concerns?: string | null;
  notes?: string | null;
  interviewer_name?: string | null;
  interviewer_email?: string | null;
  candidate: { name: string; email: string; phone: string; experience: string };
  job: { job_title: string; department: string };
}

export interface InterviewFeedbackDetail {
  application_id: string;
  round_id: string;
  interviewer_name?: string | null;
  interviewer_email?: string | null;
  rating?: number | null;
  recommendation?: string | null;
  strengths?: string | null;
  concerns?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InterviewerSectionItem {
  label: string;
  count: number;
  filter?: string;
  route?: string;
}

export interface InterviewerSectionGroup {
  title: string;
  icon: string;
  items: InterviewerSectionItem[];
}

export interface InterviewerWorkspaceData {
  status: boolean | string;
  interviews: InterviewerAssignedInterview[];
  stats: { total: number; scheduled: number; pending_feedback: number; completed: number };
  sections: InterviewerSectionGroup[];
}
@Injectable({
  providedIn: 'root'
})
export class InterviewService {

 private baseUrl = environment.apiUrl || 'http://192.168.23.11:3001/api/';

  constructor(private http: HttpClient) { }
  getBaseUrl(): string {
    const PORT = localStorage.getItem('PORT')?.replace(/["\\,]/g, '') || '3002';
    return window.location.hostname == 'localhost'
      ? localStorage.getItem('base_url')?.replace(/["\\,]/g, '') || ''
      : localStorage.getItem('base_url')?.replace(/["\\,]/g, '') || '';
  }

  addInterviewRound(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createInterviewRound`, dept);
  }
  updateInterviewRound(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateInterviewRound`, dept);
  }
  getInterviewRound(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}listInterviewRounds`, {});
  }
  deleteInterviewRound(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}deleteInterviewRound`, dept);
  }


  addRoundType(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createRoundType`, dept);
  }
  updateRoundType(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateRoundType`, dept);
  }
  getRoundType(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}listRoundTypes`, {});
  }
  deleteRoundType(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}deleteRoundType`, dept);
  }
  listRoundTypesDD(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}listRoundTypesDD`, {});
  }

  getInterviewSchedule(applicationId: string): Observable<{ status: boolean; data: InterviewRoundPlan[] }> {
    return this.http.post<{ status: boolean; data: InterviewRoundPlan[] }>(
      `${this.baseUrl}interview-schedule-detail`,
      { application_id: applicationId }
    );
  }

  saveInterviewSchedule(payload: InterviewSchedulePayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}save-interview-schedule`, payload);
  }

  saveInterviewFeedback(payload: InterviewFeedbackPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}save-interview-feedback`, payload);
  }

  // Panel user (interviewer) APIs - use panel user token, no admin token needed
  panelUserLogin(payload: { tenantId: string; email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}panel-user-login`, payload);
  }

  panelUserLogout(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}panel-user-logout`, {});
  }

  getMyInterviews(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}get-my-interviews`, {});
  }

  getInterviewerWorkspace(): Observable<InterviewerWorkspaceData> {
    return this.getMyInterviews().pipe(
      map((res: any) => {
        const interviews: InterviewerAssignedInterview[] = res?.data?.interviews || [];

        // If the same interviewer is assigned to ALL rounds of an application,
        // unlock all their rounds (sequential lock doesn't apply to solo interviewers)
        const appGroups = new Map<string, InterviewerAssignedInterview[]>();
        interviews.forEach(item => {
          if (!appGroups.has(item.application_id)) appGroups.set(item.application_id, []);
          appGroups.get(item.application_id)!.push(item);
        });
        appGroups.forEach((rounds) => {
          if (rounds.length > 1) {
            const emails = rounds.map(r => (r.interviewer_email || '').toLowerCase().trim()).filter(Boolean);
            const names  = rounds.map(r => (r.interviewer_name  || '').toLowerCase().trim()).filter(Boolean);
            const allSameEmail = emails.length === rounds.length && new Set(emails).size === 1;
            const allSameName  = names.length  === rounds.length && new Set(names).size  === 1;
            if (allSameEmail || allSameName) {
              rounds.forEach(r => (r.is_unlocked = true));
            }
          }
        });

        const apiSections = res?.data?.sections;

        return {
          status: res?.status,
          interviews,
          stats: res?.data?.stats || {
            total: interviews.length,
            scheduled: interviews.filter((item) => item.status === 'scheduled').length,
            pending_feedback: interviews.filter((item) => item.is_unlocked && !item.feedback_submitted).length,
            completed: interviews.filter((item) => item.feedback_submitted || item.status === 'completed').length
          },
          sections: Array.isArray(apiSections) && apiSections.length
            ? apiSections
            : this.buildInterviewerSections(interviews)
        };
      })
    );
  }

  panelSaveFeedback(payload: InterviewFeedbackPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}panel-save-feedback`, payload);
  }

  getPanelFeedbackDetail(payload: { application_id: string; round_id: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}panel-feedback-detail`, payload);
  }

  createInterviewPanelUser(payload: InterviewPanelUser): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createInterviewPanelUser`, payload);
  }

  updateInterviewPanelUser(payload: InterviewPanelUser): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateInterviewPanelUser`, payload);
  }

  listInterviewPanelUsers(): Observable<{ status: boolean; data: InterviewPanelUser[] }> {
    return this.http.post<{ status: boolean; data: InterviewPanelUser[] }>(`${this.baseUrl}listInterviewPanelUsers`, {});
  }

  deleteInterviewPanelUser(payload: { id: string | number }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}deleteInterviewPanelUser`, payload);
  }

  assignInterviewer(payload: {
    application_id: string;
    panel_user_id: string | number;
    round_id?: string | number | null;
    scheduled_at?: string | null;
    duration_minutes?: number | null;
    mode?: string | null;
    meeting_link?: string | null;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}assign-interviewer`, payload);
  }

  sendInterviewMail(payload: {
    application_id: string;
    candidate_name: string;
    candidate_email: string;
    interviewer_name: string;
    interviewer_email: string;
    round_name: string;
    job_title: string;
    scheduled_at: string | null;
    duration_minutes: number | null;
    mode: string;
    meeting_link: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}send-interview-mail`, payload);
  }

  private buildInterviewerSections(interviews: InterviewerAssignedInterview[]): InterviewerSectionGroup[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const scheduled = interviews.filter((item) => item.status === 'scheduled');
    const completed = interviews.filter((item) => item.feedback_submitted || item.status === 'completed');
    const pendingInterviews = interviews.filter((item) => !item.feedback_submitted && item.status !== 'scheduled' && item.status !== 'completed');
    const pendingFeedback = interviews.filter((item) => item.is_unlocked && !item.feedback_submitted);
    const feedbackSubmitted = interviews.filter((item) => item.feedback_submitted);
    const uniqueCandidates = this.getUniqueCandidates(interviews);
    const shortlistedCandidates = this.getCandidateCountExcludingRecommendation(interviews, 'rejected');
    const selectedCandidates = this.getCandidateCountByRecommendation(interviews, 'selected');
    const rejectedCandidates = this.getCandidateCountByRecommendation(interviews, 'rejected');

    return [
      {
        title: 'Interviews',
        icon: 'ri-calendar-schedule-line',
        items: [
          { label: 'All Interviews', count: interviews.length, filter: 'all', route: '/interview/interviews' },
          { label: 'Scheduled Interviews', count: scheduled.length, filter: 'scheduled', route: '/interview/interviews' },
          { label: 'Upcoming Interviews', count: scheduled.filter((item) => this.isAfterDate(item.scheduled_at, tomorrow)).length, filter: 'upcoming', route: '/interview/interviews' },
          { label: 'Pending Interviews', count: pendingInterviews.length, filter: 'pending', route: '/interview/interviews' },
          { label: "Today's Interviews", count: scheduled.filter((item) => this.isWithinDate(item.scheduled_at, today, tomorrow)).length, filter: 'today', route: '/interview/interviews' },
          { label: 'Completed Interviews', count: completed.length, filter: 'completed', route: '/interview/interviews' }
        ]
      },
      {
        title: 'Candidates',
        icon: 'ri-team-line',
        items: [
          { label: 'All Candidates', count: uniqueCandidates.length, filter: 'all', route: '/interview/candidates' },
          { label: 'Shortlisted Candidates', count: shortlistedCandidates, filter: 'shortlisted', route: '/interview/candidates' },
          { label: 'Selected Candidates', count: selectedCandidates, filter: 'selected', route: '/interview/candidates' },
          { label: 'Rejected Candidates', count: rejectedCandidates, filter: 'rejected', route: '/interview/candidates' }
        ]
      },
      {
        title: 'Feedback',
        icon: 'ri-file-list-3-line',
        items: [
          { label: 'Pending Feedback', count: pendingFeedback.length, filter: 'pending', route: '/interview/feedback' },
          { label: 'Submitted Feedback', count: feedbackSubmitted.length, filter: 'submitted', route: '/interview/feedback' },
          { label: 'Feedback History', count: feedbackSubmitted.length, filter: 'history', route: '/interview/feedback' }
        ]
      }
    ];
  }

  private getUniqueCandidates(interviews: InterviewerAssignedInterview[]) {
    const seen = new Map<string, InterviewerAssignedInterview['candidate']>();

    interviews.forEach((item) => {
      const key = item.application_id || item.candidate?.email || `${item.candidate?.name}-${item.round_id}`;
      if (key && !seen.has(key)) {
        seen.set(key, item.candidate);
      }
    });

    return Array.from(seen.values());
  }

  private getCandidateCountByRecommendation(
    interviews: InterviewerAssignedInterview[],
    recommendation: string
  ): number {
    const matches = new Set<string>();

    interviews.forEach((item) => {
      if (item.recommendation === recommendation) {
        matches.add(item.application_id || item.candidate?.email || item.round_id);
      }
    });

    return matches.size;
  }

  private getCandidateCountExcludingRecommendation(
    interviews: InterviewerAssignedInterview[],
    excludedRecommendation: string
  ): number {
    const matches = new Set<string>();

    interviews.forEach((item) => {
      if (item.recommendation !== excludedRecommendation) {
        matches.add(item.application_id || item.candidate?.email || item.round_id);
      }
    });

    return matches.size;
  }

  private isWithinDate(value: string, start: Date, end: Date): boolean {
    const date = this.parseDate(value);
    return !!date && date >= start && date < end;
  }

  private isAfterDate(value: string, min: Date): boolean {
    const date = this.parseDate(value);
    return !!date && date >= min;
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
