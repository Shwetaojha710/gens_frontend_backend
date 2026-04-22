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
import { InterviewerFeedbackComponent } from '../interviewer-feedback/interviewer-feedback.component';

@Component({
  selector: 'app-interviewer-feedback-page',
  standalone: true,
  imports: [CommonModule, FormsModule, InterviewerFeedbackComponent],
  templateUrl: './interviewer-feedback-page.component.html',
  styleUrl: './interviewer-feedback-page.component.css'
})
export class InterviewerFeedbackPageComponent implements OnInit {
  loading = false;
  notyf = new Notyf();
  items: InterviewerSectionItem[] = [];
  allFeedbackInterviews: InterviewerAssignedInterview[] = [];
  feedbackInterviews: InterviewerAssignedInterview[] = [];
  currentFilter = 'pending';
  showFeedbackViewModal = false;
  selectedInterview: InterviewerAssignedInterview | null = null;
  selectedFeedbackDetail: InterviewFeedbackDetail | null = null;
  isLoadingFeedbackDetail = false;

  constructor(
    private interviewService: InterviewService,
    private statusService: StatusService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.currentFilter = params.get('filter') || 'pending';
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
          this.items = workspace.sections.find((section) => section.title === 'Feedback')?.items || [];
          this.allFeedbackInterviews = (workspace.interviews || []).filter((item) => item.is_unlocked);
          this.applyFilter();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.notyf.error(err?.error?.message || 'Failed to load feedback');
      }
    });
  }

  private applyFilter(): void {
    switch (this.currentFilter) {
      case 'submitted':
      case 'history':
        this.feedbackInterviews = this.allFeedbackInterviews.filter((item) => item.feedback_submitted);
        break;
      case 'pending':
      default:
        this.feedbackInterviews = this.allFeedbackInterviews.filter((item) => !item.feedback_submitted);
        break;
    }
  }

  getFeedbackStatusClass(item: InterviewerAssignedInterview): string {
    return item.feedback_submitted ? 'bg-success' : 'bg-warning';
  }

  getFeedbackStatusLabel(item: InterviewerAssignedInterview): string {
    return item.feedback_submitted ? 'Submitted' : 'Pending';
  }

  openFeedbackViewModal(item: InterviewerAssignedInterview): void {
    this.selectedInterview = item;
    this.selectedFeedbackDetail = null;
    this.showFeedbackViewModal = true;
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

  getRoundMeta(item: InterviewerAssignedInterview): string {
    return `Round ${item.sequence} of ${item.total_rounds}`;
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
