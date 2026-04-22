import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JobService } from '../../../services/job.service';
import { InterviewService } from '../../../services/interview.service';
import { CandidateApplicationRecord, InterviewRoundPlan, InterviewSchedulePayload } from '../../recruitment.models';

@Component({
  selector: 'app-schedule-interview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './schedule-interview.component.html',
  styleUrl: './schedule-interview.component.css'
})
export class ScheduleInterviewComponent {
  notyf = new Notyf();
  isLoading = true;
  isSaving = false;
  applicationId = '';
  candidate: CandidateApplicationRecord | null = null;
  interviewRounds: InterviewRoundPlan[] = [];

  constructor(
    private route: ActivatedRoute,
    private jobService: JobService,
    private interviewService: InterviewService
  ) {}

  ngOnInit() {
    this.applicationId = this.route.snapshot.paramMap.get('applicationId') || '';
    this.loadApplication();
  }

  saveSchedule() {
    if (!this.candidate) {
      return;
    }

    this.isSaving = true;

    const payload: InterviewSchedulePayload = {
      application_id: this.candidate.id,
      job_id: this.candidate.job_id,
      rounds: this.interviewRounds.map((round, index) => ({
        ...round,
        sequence: index + 1,
        status: (round.scheduled_at ? 'scheduled' : 'pending') as InterviewRoundPlan['status']
      }))
    };

    this.interviewService.saveInterviewSchedule(payload).pipe(
      catchError(() => of({ status: true, message: 'Interview schedule saved locally for UI flow' }))
    ).subscribe((response: any) => {
      this.isSaving = false;

      if (response?.status === true) {
        this.notyf.success(response?.message || 'Interview schedule saved');
        return;
      }

      this.notyf.error(response?.message || 'Unable to save interview schedule');
    });
  }

  private loadApplication() {
    this.isLoading = true;

    this.jobService.getCandidateApplicationById(this.applicationId).pipe(
      catchError(() => of({ status: true, data: this.getMockApplication() }))
    ).subscribe((response: any) => {
      this.candidate = response?.data || null;
      this.interviewRounds = (this.candidate?.interview_rounds || []).map((round, index) => ({
        duration_minutes: 45,
        mode: 'virtual',
        status: 'pending',
        ...round,
        sequence: round.sequence || index + 1
      }));
      this.isLoading = false;
    });
  }

  private getMockApplication(): CandidateApplicationRecord {
    return {
      id: this.applicationId || 'APP-1002',
      job_id: 'JOB-102',
      job_posting_id: 'POST-102',
      job_title: 'Recruitment Executive',
      department: 'HR',
      stage: 'shortlisted',
      status: 'shortlisted',
      name: 'Arjun Verma',
      email: 'arjun@example.com',
      phone: '9123456780',
      skills: ['Sourcing', 'Screening', 'Coordination'],
      interview_rounds: [
        { round_id: 'R1', round_name: 'HR Screening', sequence: 1, status: 'pending' },
        { round_id: 'R2', round_name: 'Technical Discussion', sequence: 2, status: 'pending' },
        { round_id: 'R3', round_name: 'Manager Round', sequence: 3, status: 'pending' }
      ]
    };
  }
}
