import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  InterviewerAssignedInterview,
  InterviewerSectionGroup,
  InterviewService
} from '../../services/interview.service';
import { StatusService } from '../../services/status.service';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { InterviewerInterviewsComponent } from '../interviewer-interviews/interviewer-interviews.component';
import { InterviewerFeedbackComponent } from '../interviewer-feedback/interviewer-feedback.component';
import { InterviewerCandidatesComponent } from '../interviewer-candidates/interviewer-candidates.component';

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
  selector: 'app-interviewer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    InterviewerInterviewsComponent,
    InterviewerFeedbackComponent,
    InterviewerCandidatesComponent
  ],
  templateUrl: './interviewer-dashboard.component.html',
  styleUrls: ['./interviewer-dashboard.component.css']
})
export class InterviewerDashboardComponent implements OnInit {
  currentUser: any = {};
  loading = false;
  notyf = new Notyf();

  assignedInterviews: InterviewerAssignedInterview[] = [];
  stats = { total: 0, scheduled: 0, pending_feedback: 0, completed: 0 };
  sections: InterviewerSectionGroup[] = [];

  // Feedback modal
  showFeedbackModal = false;
  selectedInterview: InterviewerAssignedInterview | null = null;
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
  isSubmittingFeedback = false;
  stars = [1, 2, 3, 4, 5];

  constructor(
    private interviewService: InterviewService,
    private statusService: StatusService,
    private router: Router
  ) {
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  }

  ngOnInit(): void {
    this.loadMyInterviews();
  }

  loadMyInterviews(): void {
    this.loading = true;
    this.interviewService.getInterviewerWorkspace().subscribe({
      next: (workspace) => {
        const status = this.statusService.handleResponseStatus(workspace.status);
        if (status === true) {
          this.assignedInterviews = workspace.interviews || [];
          this.stats = workspace.stats || { total: 0, scheduled: 0, pending_feedback: 0, completed: 0 };
          this.sections = workspace.sections || [];
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        const status = this.statusService.handleResponseStatus(err?.error?.status);
        if (status === 'expired') {
          this.router.navigate(['login']);
          return;
        }
        this.notyf.error(err?.error?.message || 'Failed to load interviews');
      }
    });
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
      rating: 3,
      recommendation: 'selected',
      strengths: '',
      concerns: '',
      notes: ''
    };
    this.showFeedbackModal = true;
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
    this.selectedInterview = null;
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
          this.loadMyInterviews();
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

  getSectionItems(title: string) {
    return this.sections.find((section) => section.title === title)?.items || [];
  }
}
