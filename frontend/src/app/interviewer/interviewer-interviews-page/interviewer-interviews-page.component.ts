import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Notyf } from 'notyf';
import {
  InterviewerAssignedInterview,
  InterviewFeedbackDetail,
  InterviewerSectionItem,
  InterviewService
} from '../../services/interview.service';
import { StatusService } from '../../services/status.service';
import { InterviewerInterviewsComponent } from '../interviewer-interviews/interviewer-interviews.component';

interface FeedbackForm {
  application_id: string;
  round_id: string;
  interviewer_name: string;
  interviewer_email: string;
  rating: number;
  recommendation: string;
  strengths: string;
  concerns: string;
  notes: string;
}

@Component({
  selector: 'app-interviewer-interviews-page',
  standalone: true,
  imports: [CommonModule, FormsModule, InterviewerInterviewsComponent],
  templateUrl: './interviewer-interviews-page.component.html',
  styleUrl: './interviewer-interviews-page.component.css'
})
export class InterviewerInterviewsPageComponent implements OnInit {
  currentUser: any = {};
  loading = false;
  notyf = new Notyf();
  items: InterviewerSectionItem[] = [];
  allInterviews: InterviewerAssignedInterview[] = [];
  interviews: InterviewerAssignedInterview[] = [];
  currentFilter = 'all';
  showFeedbackModal = false;
  showFeedbackViewModal = false;
  selectedInterview: InterviewerAssignedInterview | null = null;
  selectedFeedbackDetail: InterviewFeedbackDetail | null = null;
  isSubmittingFeedback = false;
  isLoadingFeedbackDetail = false;
  stars = [1, 2, 3, 4, 5];
  feedbackForm: FeedbackForm = {
    application_id: '',
    round_id: '',
    interviewer_name: '',
    interviewer_email: '',
    rating: 3,
    recommendation: 'selected',
    strengths: '',
    concerns: '',
    notes: ''
  };

  constructor(
    private interviewService: InterviewService,
    private statusService: StatusService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.currentFilter = params.get('filter') || 'all';
      this.applyFilter();
    });
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.interviewService.getInterviewerWorkspace().subscribe({
      next: (workspace) => {
        const status = this.statusService.handleResponseStatus(workspace.status);
        if (status === true) {
          this.items = workspace.sections.find((section) => section.title === 'Interviews')?.items || [];
          this.allInterviews = workspace.interviews || [];
          this.applyFilter();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.notyf.error(err?.error?.message || 'Failed to load interviews');
      }
    });
  }

  private applyFilter(): void {
    switch (this.currentFilter) {
      case 'scheduled':
        this.interviews = this.allInterviews.filter((item) => item.status === 'scheduled');
        break;
      case 'upcoming':
        this.interviews = this.allInterviews.filter((item) => item.status === 'scheduled' && this.isUpcoming(item.scheduled_at));
        break;
      case 'pending':
        this.interviews = this.allInterviews.filter((item) => !item.feedback_submitted && item.status !== 'scheduled' && item.status !== 'completed');
        break;
      case 'today':
        this.interviews = this.allInterviews.filter((item) => item.status === 'scheduled' && this.isToday(item.scheduled_at));
        break;
      case 'completed':
        this.interviews = this.allInterviews.filter((item) => item.feedback_submitted || item.status === 'completed');
        break;
      default:
        this.interviews = [...this.allInterviews];
        break;
    }
  }

  private isToday(value: string): boolean {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const today = new Date();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }

  private isUpcoming(value: string): boolean {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return date >= tomorrow;
  }

  getStatusClass(item: InterviewerAssignedInterview): string {
    if (item.feedback_submitted || item.status === 'completed') return 'bg-success';
    if (item.status === 'scheduled') return 'bg-warning';
    if (item.status === 'cancelled') return 'bg-danger';
    return 'bg-secondary';
  }

  getStatusLabel(item: InterviewerAssignedInterview): string {
    if (item.feedback_submitted || item.status === 'completed') return 'Completed';
    if (item.status === 'scheduled') return 'Scheduled';
    if (item.status === 'cancelled') return 'Cancelled';
    return item.status || 'Pending';
  }

  openFeedbackModal(item: InterviewerAssignedInterview): void {
    this.selectedInterview = item;
    const name = [this.currentUser.first_name, this.currentUser.last_name].filter(Boolean).join(' ')
      || this.currentUser.name || this.currentUser.email || '';

    this.feedbackForm = {
      application_id: item.application_id,
      round_id: item.round_id,
      interviewer_name: name,
      interviewer_email: this.currentUser.email || '',
      rating: item.rating || 3,
      recommendation: item.recommendation || 'selected',
      strengths: item.strengths || '',
      concerns: item.concerns || '',
      notes: item.notes || ''
    };
    this.showFeedbackModal = true;
    this.showFeedbackViewModal = false;
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
    this.isSubmittingFeedback = false;
    this.selectedInterview = null;
  }

  openFeedbackViewModal(item: InterviewerAssignedInterview): void {
    this.selectedInterview = item;
    this.selectedFeedbackDetail = null;
    this.showFeedbackViewModal = true;
    this.showFeedbackModal = false;
    this.isLoadingFeedbackDetail = true;

    this.interviewService.getPanelFeedbackDetail({
      application_id: item.application_id,
      round_id: item.round_id
    }).subscribe({
      next: (res: any) => {
        if (res?.status === true) {
          this.selectedFeedbackDetail = res?.data || null;
        } else {
          this.notyf.error(res?.message || 'Failed to load feedback details');
        }
        this.isLoadingFeedbackDetail = false;
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Failed to load feedback details');
        this.isLoadingFeedbackDetail = false;
      }
    });
  }

  closeFeedbackViewModal(): void {
    this.showFeedbackViewModal = false;
    this.selectedInterview = null;
    this.selectedFeedbackDetail = null;
    this.isLoadingFeedbackDetail = false;
  }

  setRating(star: number): void {
    this.feedbackForm.rating = star;
  }

  submitFeedback(): void {
    if (!this.feedbackForm.rating || !this.feedbackForm.recommendation) {
      this.notyf.error('Please provide rating and recommendation');
      return;
    }

    this.isSubmittingFeedback = true;
    this.interviewService.panelSaveFeedback(this.feedbackForm as any).subscribe({
      next: (res: any) => {
        if (res.status === true) {
          this.notyf.success('Feedback submitted successfully');
          this.closeFeedbackModal();
          this.loadData();
        } else {
          this.notyf.error(res.message || 'Failed to submit feedback');
        }
        this.isSubmittingFeedback = false;
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Error submitting feedback');
        this.isSubmittingFeedback = false;
      }
    });
  }

  getRoundMeta(item: InterviewerAssignedInterview): string {
    return `Round ${item.sequence} of ${item.total_rounds}`;
  }

  getLockedReason(item: InterviewerAssignedInterview): string {
    return item.sequence > 1
      ? `Round ${item.sequence - 1} must complete first`
      : 'Waiting for unlock';
  }

  getRecommendationLabel(value?: string | null): string {
    if (!value) return 'Not provided';

    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getFeedbackRating(): string {
    return this.selectedFeedbackDetail?.rating ? `${this.selectedFeedbackDetail.rating}/5` : '-';
  }
}
